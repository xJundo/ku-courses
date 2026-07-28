import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import express from 'express';
import { attachUser } from './auth.js';
import { config } from './config.js';
import { migrate, pool, waitForDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import calendarRoutes from './routes/calendars.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, '..', 'dist');
const INDEX_HTML = path.join(DIST_DIR, 'index.html');

const app = express();

if (config.trustProxy > 0) {
  app.set('trust proxy', config.trustProxy);
}

app.disable('x-powered-by');
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use('/api', attachUser);

app.get('/api/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, database: 'up' });
  } catch {
    res.status(503).json({ ok: false, database: 'down' });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/calendars', calendarRoutes);

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Route API inconnue.' });
});

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
app.use('/api', (err, _req, res, _next) => {
  console.error('[api]', err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

// Static SPA. Hashed Vite assets are immutable; index.html must not be cached.
if (fs.existsSync(DIST_DIR)) {
  app.use(
    express.static(DIST_DIR, {
      index: false,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    })
  );

  app.get('*', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(INDEX_HTML);
  });
} else {
  console.warn(`[server] ${DIST_DIR} absent — lancez "npm run build" pour servir le front.`);
}

async function start() {
  await waitForDatabase();
  await migrate();

  const server = app.listen(config.port, () => {
    console.log(`🚀 KU Sejong Planificateur en écoute sur http://localhost:${config.port}`);
  });

  const shutdown = signal => async () => {
    console.log(`[server] ${signal} reçu, arrêt en cours...`);
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown('SIGTERM'));
  process.on('SIGINT', shutdown('SIGINT'));
}

start().catch(err => {
  console.error('[server] démarrage impossible:', err);
  process.exit(1);
});
