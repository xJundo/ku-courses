import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from './config.js';
import { allocateHandle } from './handles.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const pool = new pg.Pool(
  config.database.connectionString
    ? { connectionString: config.database.connectionString }
    : {
        host: config.database.host,
        port: config.database.port,
        user: config.database.user,
        password: config.database.password,
        database: config.database.database
      }
);

pool.on('error', err => {
  console.error('[db] erreur inattendue sur un client Postgres inactif:', err);
});

export function query(text, params) {
  return pool.query(text, params);
}

/**
 * Postgres may not be accepting connections yet when the container starts,
 * even with a compose healthcheck. Retry for a while before giving up.
 */
export async function waitForDatabase({ attempts = 30, delayMs = 2000 } = {}) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      if (attempt === attempts) throw err;
      console.log(`[db] Postgres indisponible (essai ${attempt}/${attempts}) — nouvelle tentative...`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

const SCHEMA = `
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_migrations (
  name       text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name  text NOT NULL,
  handle        text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS calendars (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id             uuid REFERENCES users(id) ON DELETE CASCADE,
  author_name          text NOT NULL DEFAULT 'Anonyme',
  name                 text NOT NULL,
  description          text NOT NULL DEFAULT '',
  selected_course_keys jsonb NOT NULL DEFAULT '[]'::jsonb,
  category_overrides   jsonb NOT NULL DEFAULT '{}'::jsonb,
  ratings              jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes                jsonb NOT NULL DEFAULT '{}'::jsonb,
  custom_courses       jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_credits        numeric NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS calendars_updated_at_idx ON calendars (updated_at DESC);
CREATE INDEX IF NOT EXISTS calendars_owner_idx ON calendars (owner_id);

-- One discussion thread per (calendar, course) pair: anybody signed in can
-- reply, only the comment author or the calendar owner can delete.
CREATE TABLE IF NOT EXISTS course_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  course_key  text NOT NULL,
  author_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_comments_thread_idx
  ON course_comments (calendar_id, course_key, created_at);

-- Ratings and private notes belong to the person who wrote them, not to the
-- calendar they happened to be viewing. One row per (user, course).
CREATE TABLE IF NOT EXISTS course_ratings (
  user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_key text NOT NULL,
  rating     smallint NOT NULL DEFAULT 0,
  note       text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, course_key)
);

CREATE INDEX IF NOT EXISTS course_ratings_user_idx ON course_ratings (user_id, updated_at DESC);

-- One discussion thread per rating, i.e. per (profile, course) pair — the
-- profile-page counterpart of course_comments. Anybody signed in can reply;
-- only the message author or the rated profile can delete.
CREATE TABLE IF NOT EXISTS rating_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_key  text NOT NULL,
  author_id   uuid REFERENCES users(id) ON DELETE SET NULL,
  author_name text NOT NULL,
  body        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rating_comments_thread_idx
  ON rating_comments (profile_id, course_key, created_at);

-- Explicit allow-list backing calendars whose visibility is 'restricted'.
CREATE TABLE IF NOT EXISTS calendar_shares (
  calendar_id uuid NOT NULL REFERENCES calendars(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (calendar_id, user_id)
);

CREATE INDEX IF NOT EXISTS calendar_shares_user_idx ON calendar_shares (user_id);

-- Columns added after the first deploy. Existing rows keep working: calendars
-- default to 'public', which is how every calendar behaved before.
ALTER TABLE users     ADD COLUMN IF NOT EXISTS handle     text;
ALTER TABLE calendars ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';

CREATE UNIQUE INDEX IF NOT EXISTS users_handle_key ON users (lower(handle));

DO $do$ BEGIN
  ALTER TABLE calendars
    ADD CONSTRAINT calendars_visibility_chk CHECK (visibility IN ('public', 'restricted'));
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;

DO $do$ BEGIN
  ALTER TABLE course_ratings
    ADD CONSTRAINT course_ratings_rating_chk CHECK (rating >= 0 AND rating <= 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $do$;
`;

/**
 * One-off import of the pre-Docker JSON store (app/data/calendars.json) so the
 * calendars already published on the VPS survive the migration. Imported rows
 * have no owner, which makes them read-only for everybody.
 */
async function importLegacyCalendars(client) {
  const legacyFile = path.join(__dirname, '..', 'data', 'calendars.json');
  if (!fs.existsSync(legacyFile)) return 0;

  let legacy;
  try {
    legacy = JSON.parse(fs.readFileSync(legacyFile, 'utf-8'));
  } catch (err) {
    console.warn('[db] data/calendars.json illisible, import ignoré:', err.message);
    return 0;
  }
  if (!Array.isArray(legacy) || legacy.length === 0) return 0;

  let imported = 0;
  for (const cal of legacy) {
    if (!cal || typeof cal !== 'object' || !cal.name) continue;
    await client.query(
      `INSERT INTO calendars
         (author_name, name, description, selected_course_keys, category_overrides,
          ratings, notes, custom_courses, total_credits, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10::timestamptz, now()), COALESCE($11::timestamptz, now()))`,
      [
        cal.author || 'Communauté KU',
        cal.name,
        cal.description || '',
        JSON.stringify(cal.selectedCourseKeys || []),
        JSON.stringify(cal.categoryOverrides || {}),
        JSON.stringify(cal.ratings || {}),
        JSON.stringify(cal.comments || {}),
        JSON.stringify(cal.customCourses || []),
        Number(cal.totalCredits) || 0,
        cal.createdAt || null,
        cal.updatedAt || null
      ]
    );
    imported += 1;
  }
  return imported;
}

/** Runs `fn` once ever, recording it in schema_migrations. */
async function runOnce(client, name, fn) {
  const { rowCount } = await client.query(
    'INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING',
    [name]
  );
  if (rowCount === 0) return;
  await fn();
}

/** Gives every pre-existing account the `@handle` the profile pages need. */
async function backfillHandles(client) {
  const run = (text, params) => client.query(text, params);
  const { rows } = await client.query(
    'SELECT id, display_name, email FROM users WHERE handle IS NULL ORDER BY created_at'
  );

  for (const row of rows) {
    const handle = await allocateHandle(run, {
      displayName: row.display_name,
      email: row.email
    });
    await client.query('UPDATE users SET handle = $1 WHERE id = $2', [handle, row.id]);
  }
  return rows.length;
}

/**
 * Ratings and notes used to live on the calendar row, which meant everybody
 * loading a calendar inherited (and could overwrite) its author's ratings.
 * They now live in course_ratings, keyed by user. This lifts what is already
 * in production into the new table so nothing is lost; the jsonb columns are
 * deliberately left untouched as a safety net.
 *
 * When a user owns several calendars touching the same course, the most
 * recently updated one wins — but the star and the note are picked
 * independently, so re-rating a course on a newer calendar cannot silently
 * drop the note written about it on an older one.
 */
async function backfillCourseRatings(client) {
  const { rowCount } = await client.query(`
    WITH owned AS (
      SELECT owner_id, updated_at, ratings, notes
        FROM calendars
       WHERE owner_id IS NOT NULL
    ),
    rated AS (
      SELECT DISTINCT ON (o.owner_id, e.key)
             o.owner_id,
             e.key AS course_key,
             LEAST(GREATEST(round((e.value #>> '{}')::numeric)::int, 0), 5)::smallint AS rating,
             o.updated_at
        FROM owned o
        CROSS JOIN LATERAL jsonb_each(o.ratings) AS e
       WHERE e.key <> ''
         AND jsonb_typeof(e.value) = 'number'
         AND (e.value #>> '{}')::numeric > 0
       ORDER BY o.owner_id, e.key, o.updated_at DESC
    ),
    noted AS (
      SELECT DISTINCT ON (o.owner_id, e.key)
             o.owner_id,
             e.key AS course_key,
             e.value #>> '{}' AS note,
             o.updated_at
        FROM owned o
        CROSS JOIN LATERAL jsonb_each(o.notes) AS e
       WHERE e.key <> ''
         AND jsonb_typeof(e.value) = 'string'
         AND btrim(e.value #>> '{}') <> ''
       ORDER BY o.owner_id, e.key, o.updated_at DESC
    )
    INSERT INTO course_ratings (user_id, course_key, rating, note, updated_at)
    SELECT COALESCE(r.owner_id, n.owner_id),
           COALESCE(r.course_key, n.course_key),
           COALESCE(r.rating, 0),
           COALESCE(n.note, ''),
           GREATEST(COALESCE(r.updated_at, n.updated_at), COALESCE(n.updated_at, r.updated_at))
      FROM rated r
      FULL OUTER JOIN noted n
        ON r.owner_id = n.owner_id AND r.course_key = n.course_key
    ON CONFLICT (user_id, course_key) DO NOTHING
  `);
  return rowCount;
}

export async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(SCHEMA);

    const { rows } = await client.query('SELECT count(*)::int AS count FROM calendars');
    if (rows[0].count === 0) {
      const imported = await importLegacyCalendars(client);
      if (imported > 0) {
        console.log(`[db] ${imported} calendrier(s) repris depuis data/calendars.json`);
      }
    }

    // Not guarded by runOnce: accounts created before the column existed are
    // handled above, and this is a no-op once every row has a handle.
    const handled = await backfillHandles(client);
    if (handled > 0) console.log(`[db] ${handled} pseudo(s) @ générés.`);

    await runOnce(client, '2026-07-per-user-course-ratings', async () => {
      const migrated = await backfillCourseRatings(client);
      console.log(`[db] ${migrated} note(s) de cours reprises par profil.`);
    });

    await client.query('COMMIT');
    console.log('[db] Schéma à jour.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
