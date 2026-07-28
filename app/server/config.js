import crypto from 'node:crypto';

const isProduction = process.env.NODE_ENV === 'production';

function requiredInProduction(name, fallback) {
  const value = process.env[name];
  if (value && value.trim()) return value.trim();
  if (isProduction) {
    throw new Error(
      `La variable d'environnement ${name} est obligatoire en production. ` +
        `Renseignez-la dans le fichier .env utilisé par docker compose.`
    );
  }
  console.warn(`[config] ${name} absent — valeur de développement générée à la volée.`);
  return fallback();
}

export const config = {
  isProduction,
  port: Number(process.env.PORT || 3000),
  // Discrete fields by default: a password with URL-reserved characters
  // (`/`, `@`, `#`, ...) — e.g. from `openssl rand -base64` — would silently
  // break a hand-built `postgres://user:pass@host/db` string. Only fall back
  // to DATABASE_URL for an external/managed Postgres that hands you one directly.
  database: {
    connectionString: process.env.DATABASE_URL || null,
    host: process.env.POSTGRES_HOST || 'localhost',
    port: Number(process.env.POSTGRES_PORT || 5432),
    user: process.env.POSTGRES_USER || 'ku',
    password: process.env.POSTGRES_PASSWORD || 'ku',
    database: process.env.POSTGRES_DB || 'ku_scheduler'
  },
  jwtSecret: requiredInProduction('JWT_SECRET', () => crypto.randomBytes(32).toString('hex')),
  // 30 days, expressed in seconds.
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 30),
  cookieName: process.env.COOKIE_NAME || 'ku_session',
  // Set COOKIE_SECURE=true once the app is served over HTTPS.
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  // Number of reverse proxies in front of the app (Traefik/Nginx on the VPS).
  trustProxy: Number(process.env.TRUST_PROXY || 0)
};
