import { Router } from 'express';
import {
  clearSession,
  hashPassword,
  issueSession,
  publicUser,
  rateLimit,
  requireAuth,
  verifyPassword
} from '../auth.js';
import { query } from '../db.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

const router = Router();
const credentialsLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

router.post('/register', credentialsLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');
    const displayName = String(req.body?.displayName || '').trim();

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Adresse e-mail invalide.' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res
        .status(400)
        .json({ error: `Le mot de passe doit contenir au moins ${MIN_PASSWORD_LENGTH} caractères.` });
    }
    if (displayName.length < 2 || displayName.length > 60) {
      return res.status(400).json({ error: 'Le pseudo doit contenir entre 2 et 60 caractères.' });
    }

    const passwordHash = await hashPassword(password);
    const { rows } = await query(
      `INSERT INTO users (email, password_hash, display_name)
       VALUES ($1, $2, $3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email, display_name`,
      [email, passwordHash, displayName]
    );

    if (!rows[0]) {
      return res.status(409).json({ error: 'Un compte existe déjà avec cette adresse e-mail.' });
    }

    const user = publicUser(rows[0]);
    issueSession(res, user);
    res.status(201).json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/login', credentialsLimiter, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || '');

    const { rows } = await query(
      'SELECT id, email, display_name, password_hash FROM users WHERE email = $1',
      [email]
    );
    const row = rows[0];

    // Same generic message either way so the endpoint doesn't reveal which
    // addresses have an account.
    const valid = row ? await verifyPassword(password, row.password_hash) : false;
    if (!valid) {
      return res.status(401).json({ error: 'E-mail ou mot de passe incorrect.' });
    }

    const user = publicUser(row);
    issueSession(res, user);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (_req, res) => {
  clearSession(res);
  res.json({ ok: true });
});

router.get('/me', (req, res) => {
  res.json({ user: req.user });
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const displayName = String(req.body?.displayName || '').trim();
    if (displayName.length < 2 || displayName.length > 60) {
      return res.status(400).json({ error: 'Le pseudo doit contenir entre 2 et 60 caractères.' });
    }

    const { rows } = await query(
      'UPDATE users SET display_name = $1 WHERE id = $2 RETURNING id, email, display_name',
      [displayName, req.user.id]
    );
    // Keep the denormalised author name on existing calendars in sync.
    await query('UPDATE calendars SET author_name = $1 WHERE owner_id = $2', [
      displayName,
      req.user.id
    ]);

    res.json({ user: publicUser(rows[0]) });
  } catch (err) {
    next(err);
  }
});

export default router;
