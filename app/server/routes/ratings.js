import { Router } from 'express';
import { requireAuth } from '../auth.js';
import { query } from '../db.js';

const MAX_NOTE_LENGTH = 2000;
const MAX_BULK_ENTRIES = 2000;

const router = Router();

/** Turns rating rows into the two lookup maps the client works with. */
function toMaps(rows) {
  const ratings = {};
  const notes = {};
  for (const row of rows) {
    if (row.rating > 0) ratings[row.course_key] = row.rating;
    if (row.note) notes[row.course_key] = row.note;
  }
  return { ratings, notes };
}

function normalizeRating(value) {
  const rating = Math.round(Number(value) || 0);
  return Math.min(Math.max(rating, 0), 5);
}

function normalizeNote(value) {
  return String(value ?? '').trim().slice(0, MAX_NOTE_LENGTH);
}

router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query(
      'SELECT course_key, rating, note FROM course_ratings WHERE user_id = $1',
      [req.user.id]
    );
    res.json(toMaps(rows));
  } catch (err) {
    next(err);
  }
});

/** Upserts a single course rating / note. Empty rating + empty note deletes it. */
router.put('/me/:courseKey', requireAuth, async (req, res, next) => {
  try {
    const courseKey = String(req.params.courseKey || '').trim();
    if (!courseKey) {
      return res.status(400).json({ error: 'Cours cible manquant.' });
    }

    const rating = normalizeRating(req.body?.rating);
    const note = normalizeNote(req.body?.note);

    if (rating === 0 && !note) {
      await query('DELETE FROM course_ratings WHERE user_id = $1 AND course_key = $2', [
        req.user.id,
        courseKey
      ]);
      return res.json({ courseKey, rating: 0, note: '' });
    }

    await query(
      `INSERT INTO course_ratings (user_id, course_key, rating, note)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, course_key)
       DO UPDATE SET rating = EXCLUDED.rating, note = EXCLUDED.note, updated_at = now()`,
      [req.user.id, courseKey, rating, note]
    );
    res.json({ courseKey, rating, note });
  } catch (err) {
    next(err);
  }
});

/**
 * Bulk merge, used once per browser to lift the ratings that predate this
 * feature out of localStorage. Existing server-side rows always win, so
 * replaying it can never overwrite something the account already has.
 */
router.post('/me/import', requireAuth, async (req, res, next) => {
  try {
    const ratings = req.body?.ratings;
    const notes = req.body?.notes;
    const keys = new Set([
      ...Object.keys(ratings && typeof ratings === 'object' ? ratings : {}),
      ...Object.keys(notes && typeof notes === 'object' ? notes : {})
    ]);

    if (keys.size > MAX_BULK_ENTRIES) {
      return res.status(400).json({ error: 'Trop de notes envoyées en une fois.' });
    }

    let imported = 0;
    for (const rawKey of keys) {
      const courseKey = String(rawKey).trim();
      if (!courseKey) continue;

      const rating = normalizeRating(ratings?.[rawKey]);
      const note = normalizeNote(notes?.[rawKey]);
      if (rating === 0 && !note) continue;

      const { rowCount } = await query(
        `INSERT INTO course_ratings (user_id, course_key, rating, note)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, course_key) DO NOTHING`,
        [req.user.id, courseKey, rating, note]
      );
      imported += rowCount;
    }

    const { rows } = await query(
      'SELECT course_key, rating, note FROM course_ratings WHERE user_id = $1',
      [req.user.id]
    );
    res.json({ imported, ...toMaps(rows) });
  } catch (err) {
    next(err);
  }
});

export default router;
