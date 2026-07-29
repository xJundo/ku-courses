import { Router } from 'express';
import { calendarVisibleTo, isUuid } from '../access.js';
import { requireAuth } from '../auth.js';
import { query } from '../db.js';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;
const MAX_COMMENT_LENGTH = 2000;

const router = Router();

/**
 * The directory is public, like the community calendars it links to, so e-mail
 * addresses are never part of a profile payload — `@handle` is the public
 * identifier.
 */
function serializeProfile(row, viewerId) {
  return {
    id: row.id,
    displayName: row.display_name,
    handle: row.handle,
    createdAt: row.created_at,
    isSelf: Boolean(viewerId && row.id === viewerId),
    calendarCount: Number(row.calendar_count) || 0,
    ratingCount: Number(row.rating_count) || 0,
    lastActiveAt: row.last_active_at || row.created_at
  };
}

/** Directory of every account, with the counts that matter at a glance. */
router.get('/', async (req, res, next) => {
  try {
    const viewerId = req.user?.id ?? null;
    const search = String(req.query.q || '').trim().replace(/^@+/, '');
    const limit = Math.min(Number(req.query.limit) || DEFAULT_LIMIT, MAX_LIMIT);

    const { rows } = await query(
      `SELECT u.id, u.display_name, u.handle, u.created_at,
              (SELECT count(*) FROM calendars c
                WHERE c.owner_id = u.id AND ${calendarVisibleTo('c', '$1')}) AS calendar_count,
              (SELECT count(*) FROM course_ratings r WHERE r.user_id = u.id) AS rating_count,
              (SELECT max(c.updated_at) FROM calendars c
                WHERE c.owner_id = u.id AND ${calendarVisibleTo('c', '$1')}) AS last_active_at
         FROM users u
        WHERE $2::text = ''
           OR u.display_name ILIKE '%' || $2 || '%'
           OR u.handle ILIKE '%' || $2 || '%'
        ORDER BY u.display_name ASC
        LIMIT $3`,
      [viewerId, search, limit]
    );

    res.json({ users: rows.map(row => serializeProfile(row, viewerId)) });
  } catch (err) {
    next(err);
  }
});

/** A single profile, addressable by uuid or by `@handle`. */
router.get('/:idOrHandle', async (req, res, next) => {
  try {
    const viewerId = req.user?.id ?? null;
    const key = String(req.params.idOrHandle || '').replace(/^@+/, '');

    const { rows } = await query(
      `SELECT u.id, u.display_name, u.handle, u.created_at,
              (SELECT count(*) FROM calendars c
                WHERE c.owner_id = u.id AND ${calendarVisibleTo('c', '$1')}) AS calendar_count,
              (SELECT count(*) FROM course_ratings r WHERE r.user_id = u.id) AS rating_count,
              (SELECT max(c.updated_at) FROM calendars c
                WHERE c.owner_id = u.id AND ${calendarVisibleTo('c', '$1')}) AS last_active_at
         FROM users u
        WHERE ($2::uuid IS NOT NULL AND u.id = $2::uuid) OR lower(u.handle) = lower($3)`,
      [viewerId, isUuid(key) ? key : null, key]
    );

    if (!rows[0]) {
      return res.status(404).json({ error: 'Profil introuvable.' });
    }
    res.json({ profile: serializeProfile(rows[0], viewerId) });
  } catch (err) {
    next(err);
  }
});

/**
 * Course ratings of a profile: the whole point of the profile page, so both
 * the star and the note are readable by everybody. Only the author can change
 * them — editing goes through `/api/ratings/me`, never through this route.
 */
router.get('/:id/ratings', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Profil introuvable.' });
    }

    const { rows } = await query(
      `SELECT r.course_key, r.rating, r.note, r.updated_at,
              (SELECT count(*) FROM rating_comments rc
                WHERE rc.profile_id = r.user_id AND rc.course_key = r.course_key) AS comment_count
         FROM course_ratings r
        WHERE r.user_id = $1
        ORDER BY r.rating DESC, r.course_key ASC`,
      [req.params.id]
    );

    res.json({
      ratings: rows.map(row => ({
        courseKey: row.course_key,
        rating: row.rating,
        note: row.note,
        commentCount: Number(row.comment_count) || 0,
        updatedAt: row.updated_at
      }))
    });
  } catch (err) {
    next(err);
  }
});

/* ---------------------------------------------------------------------------
 * Discussion threads on a profile's ratings
 * ------------------------------------------------------------------------ */

function serializeComment(row, viewerId, profileId) {
  return {
    id: row.id,
    courseKey: row.course_key,
    author: row.author_name,
    authorId: row.author_id,
    body: row.body,
    createdAt: row.created_at,
    canDelete: Boolean(viewerId && (row.author_id === viewerId || profileId === viewerId))
  };
}

router.get('/:id/comments', async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Profil introuvable.' });
    }

    const { rows } = await query(
      `SELECT id, course_key, author_id, author_name, body, created_at
         FROM rating_comments
        WHERE profile_id = $1
        ORDER BY created_at ASC`,
      [req.params.id]
    );

    // Grouped by course key so the UI can render one thread per rating.
    const threads = {};
    for (const row of rows) {
      (threads[row.course_key] ||= []).push(serializeComment(row, req.user?.id, req.params.id));
    }
    res.json({ threads });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/comments', requireAuth, async (req, res, next) => {
  try {
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Profil introuvable.' });
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

    // A thread only exists where there is a rating to discuss; this keeps the
    // profile page from turning into a free-form message board.
    const rating = await query(
      'SELECT 1 FROM course_ratings WHERE user_id = $1 AND course_key = $2',
      [req.params.id, courseKey]
    );
    if (rating.rowCount === 0) {
      return res.status(404).json({ error: 'Ce profil n’a pas noté ce cours.' });
    }

    const { rows } = await query(
      `INSERT INTO rating_comments (profile_id, course_key, author_id, author_name, body)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, course_key, author_id, author_name, body, created_at`,
      [req.params.id, courseKey, req.user.id, req.user.displayName, body]
    );

    res.status(201).json({ comment: serializeComment(rows[0], req.user.id, req.params.id) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/comments/:commentId', requireAuth, async (req, res, next) => {
  try {
    if (!isUuid(req.params.id) || !isUuid(req.params.commentId)) {
      return res.status(404).json({ error: 'Message introuvable.' });
    }

    // Removable by its author, or by the rated profile moderating its own page.
    const { rowCount } = await query(
      `DELETE FROM rating_comments
        WHERE id = $1
          AND profile_id = $2
          AND (author_id = $3 OR profile_id = $3)`,
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
