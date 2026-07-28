import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from './config.js';

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

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name  text NOT NULL,
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

    await client.query('COMMIT');
    console.log('[db] Schéma à jour.');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
