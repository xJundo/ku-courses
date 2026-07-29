import { Router } from 'express';
import { calendarVisibleTo, isUuid } from '../access.js';
import { query } from '../db.js';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

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
 * Course ratings of a profile. The star rating is public — it is the point of
 * the profile page — but the free-text note stays private to its author.
 */
router.get('/:id/ratings', async (req, res, next) => {
  try {
    const viewerId = req.user?.id ?? null;
    if (!isUuid(req.params.id)) {
      return res.status(404).json({ error: 'Profil introuvable.' });
    }

    const isSelf = viewerId === req.params.id;
    const { rows } = await query(
      `SELECT course_key, rating, note, updated_at
         FROM course_ratings
        WHERE user_id = $1
        ORDER BY rating DESC, course_key ASC`,
      [req.params.id]
    );

    res.json({
      ratings: rows.map(row => ({
        courseKey: row.course_key,
        rating: row.rating,
        note: isSelf ? row.note : '',
        hasNote: Boolean(row.note),
        updatedAt: row.updated_at
      }))
    });
  } catch (err) {
    next(err);
  }
});

export default router;
