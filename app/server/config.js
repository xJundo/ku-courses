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
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://ku:ku@localhost:5432/ku_scheduler',
  jwtSecret: requiredInProduction('JWT_SECRET', () => crypto.randomBytes(32).toString('hex')),
  // 30 days, expressed in seconds.
  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 30),
  cookieName: process.env.COOKIE_NAME || 'ku_session',
  // Set COOKIE_SECURE=true once the app is served over HTTPS.
  cookieSecure: process.env.COOKIE_SECURE === 'true',
  // Number of reverse proxies in front of the app (Traefik/Nginx on the VPS).
  trustProxy: Number(process.env.TRUST_PROXY || 0)
};
