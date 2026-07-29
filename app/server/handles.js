const MAX_BASE_LENGTH = 24;
const MAX_ATTEMPTS = 50;

/**
 * Public identifier used to mention and search for a profile (`@pseudo`).
 * Kept ASCII and lowercase so it can be typed without an accented keyboard.
 */
export function slugifyHandle(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, MAX_BASE_LENGTH);
}

/**
 * Derives a free handle from a display name, falling back to the e-mail local
 * part and then to a generic base. Suffixes `2`, `3`, … on collision.
 *
 * `run` is a `(text, params) => Promise<{ rows }>` executor so this works both
 * on the pool and inside a migration transaction.
 */
export async function allocateHandle(run, { displayName, email } = {}) {
  const base =
    slugifyHandle(displayName) || slugifyHandle(String(email || '').split('@')[0]) || 'etudiant';

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const candidate = attempt === 1 ? base : `${base}${attempt}`;
    const { rows } = await run('SELECT 1 FROM users WHERE lower(handle) = lower($1)', [candidate]);
    if (rows.length === 0) return candidate;
  }

  // Practically unreachable; keeps registration working rather than failing.
  return `${base}${Date.now().toString(36)}`.slice(0, 30);
}
