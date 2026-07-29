import { Router } from 'express';
import { calendarVisibleTo, isUuid } from '../access.js';
import { requireAuth } from '../auth.js';
import { query } from '../db.js';

const MAX_COMMENT_LENGTH = 2000;
const MAX_SHARED_USERS = 200;
const VISIBILITIES = ['public', 'restricted'];

const router = Router();

function asArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function asObject(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

function serializeCalendar(row, currentUserId, extras = {}) {
  const isOwner = Boolean(currentUserId && row.owner_id === currentUserId);
  return {
    id: row.id,
    name: row.name,
    author: row.author_name,
    ownerId: row.owner_id,
    ownerHandle: extras.ownerHandle ?? row.owner_handle ?? null,
    isOwner,
    visibility: row.visibility || 'public',
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    selectedCourseKeys: asArray(row.selected_course_keys),
    categoryOverrides: asObject(row.category_overrides),
    customCourses: asArray(row.custom_courses),
    courseCount: asArray(row.selected_course_keys).length,
    totalCredits: Number(row.total_credits) || 0,
    // Ratings shown next to the courses belong to the calendar's author and
    // are read-only for everybody else. The author's private per-course notes
    // are never part of this payload — they live on their profile.
    authorRatings: extras.authorRatings ?? asObject(row.ratings),
    sharedWith: extras.sharedWith ?? [],
    sharedCount: extras.sharedWith ? extras.sharedWith.length : Number(row.shared_count) || 0
  };
}

function serializeSummary(row, currentUserId) {
  return {
    id: row.id,
    name: row.name,
    author: row.author_name,
    ownerId: row.owner_id,
    ownerHandle: row.owner_handle ?? null,
    isOwner: Boolean(currentUserId && row.owner_id === currentUserId),
    visibility: row.visibility || 'public',
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    courseCount: Number(row.course_count) || 0,
    totalCredits: Number(row.total_credits) || 0,
    commentCount: Number(row.comment_count) || 0,
    sharedCount: Number(row.shared_count) || 0
  };
}

function serializeComment(row, currentUserId, calendarOwnerId) {
  return {
    id: row.id,
    courseKey: row.course_key,
    author: row.author_name,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
    canDelete: Boolean(
      currentUserId && (row.author_id === currentUserId || calendarOwnerId === currentUserId)
    )
  };
}

/** Loads a calendar only if the viewer is allowed to see it. */
async function loadVisibleCalendar(id, viewerId) {
  const { rows } = await query(
    `SELECT c.*,
            (SELECT u.handle FROM users u WHERE u.id = c.owner_id) AS owner_handle,
            (SELECT count(*) FROM calendar_shares s WHERE s.calendar_id = c.id) AS shared_count
       FROM calendars c
      WHERE c.id = $1 AND ${calendarVisibleTo('c', '$2')}`,
    [id, viewerId ?? null]
  );
  return rows[0] || null;
}

/** The people a restricted calendar is explicitly shared with. */
async function loadShares(calendarId) {
  const { rows } = await query(
    `SELECT u.id, u.display_name, u.handle
       FROM calendar_shares s
       JOIN users u ON u.id = s.user_id
      WHERE s.calendar_id = $1
      ORDER BY u.display_name ASC`,
    [calendarId]
  );
  return rows.map(row => ({ id: row.id, displayName: row.display_name, handle: row.handle }));
}

/** The author's own ratings, which is what a calendar now displays. */
async function loadAuthorRatings(ownerId) {
  if (!ownerId) return null;
  const { rows } = await query(
    'SELECT course_key, rating FROM course_ratings WHERE user_id = $1 AND rating > 0',
    [ownerId]
  );
  return Object.fromEntries(rows.map(row => [row.course_key, row.rating]));
}

/** Replaces the allow-list of a calendar in one shot. */
async function replaceShares(calendarId, ownerId, userIds) {
  const unique = [...new Set(userIds.map(String).filter(isUuid))]
    .filter(id => id !== ownerId)
    .slice(0, MAX_SHARED_USERS);

  await query('DELETE FROM calendar_shares WHERE calendar_id = $1', [calendarId]);
  if (unique.length > 0) {
    await query(
      `INSERT INTO calendar_shares (calendar_id, user_id)
       SELECT $1, u.id FROM users u WHERE u.id = ANY($2::uuid[])
       ON CONFLICT DO NOTHING`,
      [calendarId, unique]
    );
  }
  return loadShares(calendarId);
}

/**
 * Public calendars, plus the restricted ones the viewer owns or was invited to.
 * `?owner=<uuid>` narrows the list to a single profile.
 */
router.get('/', async (req, res, next) => {
  try {
    const viewerId = req.user?.id ?? null;
    const owner = isUuid(req.query.owner) ? req.query.owner : null;

    const { rows } = await query(
      `SELECT c.id, c.owner_id, c.author_name, c.name, c.description, c.visibility,
              c.created_at, c.updated_at, c.total_credits,
              (SELECT u.handle FROM users u WHERE u.id = c.owner_id) AS owner_handle,
              jsonb_array_length(c.selected_course_keys) AS course_count,
              (SELECT count(*) FROM course_comments cc WHERE cc.calendar_id = c.id) AS comment_count,
              (SELECT count(*) FROM calendar_shares s WHERE s.calendar_id = c.id) AS shared_count
         FROM calendars c
        WHERE ${calendarVisibleTo('c', '$1')}
          AND ($2::uuid IS NULL OR c.owner_id = $2::uuid)
        ORDER BY c.updated_at DESC
        LIMIT 500`,
      [viewerId, owner]
    );
    res.json({ calendars: rows.map(row => serializeSummary(row, viewerId)) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }

    const viewerId = req.user?.id ?? null;
    const row = await loadVisibleCalendar(req.params.id, viewerId);
    if (!row) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }

    const isOwner = Boolean(viewerId && row.owner_id === viewerId);
    const [authorRatings, sharedWith] = await Promise.all([
      loadAuthorRatings(row.owner_id),
      isOwner ? loadShares(row.id) : Promise.resolve(null)
    ]);

    res.json({
      calendar: serializeCalendar(row, viewerId, {
        authorRatings: authorRatings ?? undefined,
        sharedWith: sharedWith ?? undefined
      })
    });
  } catch (err) {
    next(err);
  }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (name.length < 2 || name.length > 120) {
      return res.status(400).json({ error: 'Le nom du calendrier doit contenir entre 2 et 120 caractères.' });
    }

    const visibility = VISIBILITIES.includes(req.body?.visibility) ? req.body.visibility : 'public';
    const selectedCourseKeys = asArray(req.body?.selectedCourseKeys).map(String);

    const { rows } = await query(
      `INSERT INTO calendars
         (owner_id, author_name, name, description, selected_course_keys,
          category_overrides, custom_courses, total_credits, visibility)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.user.id,
        req.user.displayName,
        name,
        String(req.body?.description || '').trim().slice(0, 1000),
        JSON.stringify(selectedCourseKeys),
        JSON.stringify(asObject(req.body?.categoryOverrides)),
        JSON.stringify(asArray(req.body?.customCourses)),
        Number(req.body?.totalCredits) || 0,
        visibility
      ]
    );

    const sharedWith = Array.isArray(req.body?.sharedWith)
      ? await replaceShares(rows[0].id, req.user.id, req.body.sharedWith)
      : [];

    res.status(201).json({
      calendar: serializeCalendar(rows[0], req.user.id, {
        authorRatings: (await loadAuthorRatings(req.user.id)) ?? undefined,
        ownerHandle: req.user.handle,
        sharedWith
      })
    });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }

    const existing = await query('SELECT owner_id FROM calendars WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }
    if (existing.rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Seul le propriétaire peut modifier ce calendrier.' });
    }

    const body = req.body || {};
    const updates = [];
    const values = [];

    const push = (column, value) => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (typeof body.name === 'string') {
      const name = body.name.trim();
      if (name.length < 2 || name.length > 120) {
        return res.status(400).json({ error: 'Le nom du calendrier doit contenir entre 2 et 120 caractères.' });
      }
      push('name', name);
    }
    if (typeof body.description === 'string') {
      push('description', body.description.trim().slice(0, 1000));
    }
    if (body.visibility !== undefined) {
      if (!VISIBILITIES.includes(body.visibility)) {
        return res.status(400).json({ error: 'Visibilité inconnue.' });
      }
      push('visibility', body.visibility);
    }
    if (body.selectedCourseKeys !== undefined) {
      push('selected_course_keys', JSON.stringify(asArray(body.selectedCourseKeys).map(String)));
    }
    if (body.categoryOverrides !== undefined) {
      push('category_overrides', JSON.stringify(asObject(body.categoryOverrides)));
    }
    if (body.customCourses !== undefined) {
      push('custom_courses', JSON.stringify(asArray(body.customCourses)));
    }
    if (body.totalCredits !== undefined) {
      push('total_credits', Number(body.totalCredits) || 0);
    }

    const sharesProvided = Array.isArray(body.sharedWith);
    if (updates.length === 0 && !sharesProvided) {
      return res.status(400).json({ error: 'Aucune modification fournie.' });
    }

    let row;
    if (updates.length > 0) {
      updates.push('updated_at = now()');
      values.push(req.params.id);
      const { rows } = await query(
        `UPDATE calendars SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
        values
      );
      row = rows[0];
    } else {
      const { rows } = await query('SELECT * FROM calendars WHERE id = $1', [req.params.id]);
      row = rows[0];
    }

    const sharedWith = sharesProvided
      ? await replaceShares(row.id, req.user.id, body.sharedWith)
      : await loadShares(row.id);

    res.json({
      calendar: serializeCalendar(row, req.user.id, {
        authorRatings: (await loadAuthorRatings(req.user.id)) ?? undefined,
        ownerHandle: req.user.handle,
        sharedWith
      })
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }
    const { rowCount } = await query('DELETE FROM calendars WHERE id = $1 AND owner_id = $2', [
      req.params.id,
      req.user.id
    ]);
    if (rowCount === 0) {
      return res
        .status(403)
        .json({ error: 'Seul le propriétaire peut supprimer ce calendrier.' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------------------------------------------------
 * Access list
 * ------------------------------------------------------------------------ */

router.get('/:id/shares', requireAuth, async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }
    const { rows } = await query('SELECT owner_id, visibility FROM calendars WHERE id = $1', [
      req.params.id
    ]);
    if (!rows[0]) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }
    if (rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Seul le propriétaire peut voir la liste d’accès.' });
    }

    res.json({ visibility: rows[0].visibility, sharedWith: await loadShares(req.params.id) });
  } catch (err) {
    next(err);
  }
});

/** Sets visibility and, when restricted, the exact list of invited profiles. */
router.put('/:id/shares', requireAuth, async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }
    const { rows } = await query('SELECT owner_id FROM calendars WHERE id = $1', [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }
    if (rows[0].owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Seul le propriétaire peut modifier la liste d’accès.' });
    }

    const visibility = VISIBILITIES.includes(req.body?.visibility) ? req.body.visibility : null;
    if (!visibility) {
      return res.status(400).json({ error: 'Visibilité inconnue.' });
    }

    await query('UPDATE calendars SET visibility = $1 WHERE id = $2', [visibility, req.params.id]);
    const sharedWith = await replaceShares(
      req.params.id,
      req.user.id,
      asArray(req.body?.sharedWith)
    );

    res.json({ visibility, sharedWith });
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------------------------------------------------
 * Per-course discussion threads
 * ------------------------------------------------------------------------ */

router.get('/:id/comments', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }

    const calendar = await loadVisibleCalendar(req.params.id, req.user?.id ?? null);
    if (!calendar) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }

    const { rows } = await query(
      `SELECT id, course_key, author_id, author_name, body, created_at
         FROM course_comments
        WHERE calendar_id = $1
        ORDER BY created_at ASC`,
      [req.params.id]
    );

    // Grouped by course key so the UI can render one thread per course.
    const threads = {};
    for (const row of rows) {
      const comment = serializeComment(row, req.user?.id, calendar.owner_id);
      (threads[row.course_key] ||= []).push(comment);
    }
    res.json({ threads });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }

    const courseKey = String(req.body?.courseKey || '').trim();
    const body = String(req.body?.body || '').trim();

    if (!courseKey) {
      return res.status(400).json({ error: 'Cours cible manquant.' });
    }
    if (!body) {
      return res.status(400).json({ error: 'Le message ne peut pas être vide.' });
    }
    if (body.length > MAX_COMMENT_LENGTH) {
      return res
        .status(400)
        .json({ error: `Le message ne peut pas dépasser ${MAX_COMMENT_LENGTH} caractères.` });
    }

    const calendar = await loadVisibleCalendar(req.params.id, req.user.id);
    if (!calendar) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }

    const { rows } = await query(
      `INSERT INTO course_comments (calendar_id, course_key, author_id, author_name, body)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, course_key, author_id, author_name, body, created_at`,
      [req.params.id, courseKey, req.user.id, req.user.displayName, body]
    );

    res.status(201).json({ comment: serializeComment(rows[0], req.user.id, calendar.owner_id) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/comments/:commentId', requireAuth, async (req, res, next) => {
  try {
    if (!isUuid(req.params.id) || !isUuid(req.params.commentId)) {
      return res.status(404).json({ error: 'Message introuvable.' });
    }

    // A comment can be removed by its author, or by the calendar owner acting
    // as moderator of their own thread.
    const { rowCount } = await query(
      `DELETE FROM course_comments cc
        USING calendars c
        WHERE cc.calendar_id = c.id
          AND cc.id = $1
          AND cc.calendar_id = $2
          AND (cc.author_id = $3 OR c.owner_id = $3)`,
      [req.params.commentId, req.params.id, req.user.id]
    );

    if (rowCount === 0) {
      return res.status(403).json({ error: 'Vous ne pouvez pas supprimer ce message.' });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
