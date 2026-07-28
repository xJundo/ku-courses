import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { query } from '../db.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_COMMENT_LENGTH = 2000;

const router = Router();

function isUuid(value) {
  return UUID_RE.test(String(value || ''));
}

function asArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function asObject(value, fallback = {}) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : fallback;
}

function serializeCalendar(row, currentUserId) {
  return {
    id: row.id,
    name: row.name,
    author: row.author_name,
    ownerId: row.owner_id,
    isOwner: Boolean(currentUserId && row.owner_id === currentUserId),
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    selectedCourseKeys: asArray(row.selected_course_keys),
    categoryOverrides: asObject(row.category_overrides),
    ratings: asObject(row.ratings),
    notes: asObject(row.notes),
    customCourses: asArray(row.custom_courses),
    courseCount: asArray(row.selected_course_keys).length,
    totalCredits: Number(row.total_credits) || 0
  };
}

function serializeSummary(row, currentUserId) {
  return {
    id: row.id,
    name: row.name,
    author: row.author_name,
    ownerId: row.owner_id,
    isOwner: Boolean(currentUserId && row.owner_id === currentUserId),
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    courseCount: Number(row.course_count) || 0,
    totalCredits: Number(row.total_credits) || 0,
    commentCount: Number(row.comment_count) || 0
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

/** Every calendar is public by design — no visibility filter here. */
router.get('/', async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT c.id, c.owner_id, c.author_name, c.name, c.description,
              c.created_at, c.updated_at, c.total_credits,
              jsonb_array_length(c.selected_course_keys) AS course_count,
              (SELECT count(*) FROM course_comments cc WHERE cc.calendar_id = c.id) AS comment_count
         FROM calendars c
        ORDER BY c.updated_at DESC
        LIMIT 500`
    );
    res.json({ calendars: rows.map(row => serializeSummary(row, req.user?.id)) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }
    const { rows } = await query('SELECT * FROM calendars WHERE id = $1', [req.params.id]);
    if (!rows[0]) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }
    res.json({ calendar: serializeCalendar(rows[0], req.user?.id) });
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

    const selectedCourseKeys = asArray(req.body?.selectedCourseKeys).map(String);
    const { rows } = await query(
      `INSERT INTO calendars
         (owner_id, author_name, name, description, selected_course_keys,
          category_overrides, ratings, notes, custom_courses, total_credits)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        req.user.id,
        req.user.displayName,
        name,
        String(req.body?.description || '').trim().slice(0, 1000),
        JSON.stringify(selectedCourseKeys),
        JSON.stringify(asObject(req.body?.categoryOverrides)),
        JSON.stringify(asObject(req.body?.ratings)),
        JSON.stringify(asObject(req.body?.notes)),
        JSON.stringify(asArray(req.body?.customCourses)),
        Number(req.body?.totalCredits) || 0
      ]
    );
    res.status(201).json({ calendar: serializeCalendar(rows[0], req.user.id) });
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
    if (body.selectedCourseKeys !== undefined) {
      push('selected_course_keys', JSON.stringify(asArray(body.selectedCourseKeys).map(String)));
    }
    if (body.categoryOverrides !== undefined) {
      push('category_overrides', JSON.stringify(asObject(body.categoryOverrides)));
    }
    if (body.ratings !== undefined) {
      push('ratings', JSON.stringify(asObject(body.ratings)));
    }
    if (body.notes !== undefined) {
      push('notes', JSON.stringify(asObject(body.notes)));
    }
    if (body.customCourses !== undefined) {
      push('custom_courses', JSON.stringify(asArray(body.customCourses)));
    }
    if (body.totalCredits !== undefined) {
      push('total_credits', Number(body.totalCredits) || 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune modification fournie.' });
    }

    updates.push('updated_at = now()');
    values.push(req.params.id);

    const { rows } = await query(
      `UPDATE calendars SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    res.json({ calendar: serializeCalendar(rows[0], req.user.id) });
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
 * Per-course discussion threads
 * ------------------------------------------------------------------------ */

router.get('/:id/comments', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }

    const calendar = await query('SELECT owner_id FROM calendars WHERE id = $1', [req.params.id]);
    if (!calendar.rows[0]) {
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
      const comment = serializeComment(row, req.user?.id, calendar.rows[0].owner_id);
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

    const calendar = await query('SELECT owner_id FROM calendars WHERE id = $1', [req.params.id]);
    if (!calendar.rows[0]) {
      return res.status(404).json({ error: 'Calendrier introuvable.' });
    }

    const { rows } = await query(
      `INSERT INTO course_comments (calendar_id, course_key, author_id, author_name, body)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, course_key, author_id, author_name, body, created_at`,
      [req.params.id, courseKey, req.user.id, req.user.displayName, body]
    );

    res
      .status(201)
      .json({ comment: serializeComment(rows[0], req.user.id, calendar.rows[0].owner_id) });
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
