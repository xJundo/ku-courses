import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from './config.js';
import { query } from './db.js';

const BCRYPT_ROUNDS = 12;

export function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function issueSession(res, user) {
  const token = jwt.sign({ sub: user.id }, config.jwtSecret, {
    expiresIn: config.sessionTtlSeconds
  });
  res.cookie(config.cookieName, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    maxAge: config.sessionTtlSeconds * 1000,
    path: '/'
  });
}

export function clearSession(res) {
  res.clearCookie(config.cookieName, {
    httpOnly: true,
    sameSite: 'lax',
    secure: config.cookieSecure,
    path: '/'
  });
}

export function publicUser(row) {
  if (!row) return null;
  return { id: row.id, email: row.email, displayName: row.display_name, handle: row.handle };
}

/**
 * Resolves req.user from the session cookie when present. Never fails the
 * request: routes decide whether authentication is mandatory.
 */
export async function attachUser(req, _res, next) {
  req.user = null;
  const token = req.cookies?.[config.cookieName];
  if (!token) return next();

  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const { rows } = await query(
      'SELECT id, email, display_name, handle FROM users WHERE id = $1',
      [payload.sub]
    );
    if (rows[0]) req.user = publicUser(rows[0]);
  } catch {
    // Expired or tampered cookie: treated as anonymous.
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Vous devez être connecté pour effectuer cette action.' });
  }
  next();
}

/**
 * Minimal in-memory throttling for credential endpoints. Enough to blunt
 * password guessing on a single-instance deployment.
 */
export function rateLimit({ windowMs = 15 * 60 * 1000, max = 20 } = {}) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= now) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count += 1;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: `Trop de tentatives. Réessayez dans ${Math.ceil(retryAfter / 60)} minute(s).`
      });
    }
    next();
  };
}
