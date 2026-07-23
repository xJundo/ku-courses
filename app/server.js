import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.join(__dirname, 'dist');
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'calendars.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getSeedCalendars() {
  const now = new Date().toISOString();
  return [
    {
      id: 'cal_default_epitech',
      name: 'Exemple - Track IT & Business (3 Jours)',
      author: 'Communauté KU',
      description: 'Exemple de calendrier optimisé du lundi au mercredi.',
      createdAt: now,
      updatedAt: now,
      selectedCourseKeys: ['COSE211_01', 'COSE341_01', 'BUSN101_01', 'KORE101_01'],
      categoryOverrides: {},
      ratings: { COSE211_01: 5 },
      comments: { COSE211_01: "Très recommandé pour l'échange" },
      customCourses: [],
      courseCount: 4,
      totalCredits: 12
    }
  ];
}

function getCalendars() {
  if (!fs.existsSync(DATA_FILE)) {
    const seed = getSeedCalendars();
    saveCalendars(seed);
    return seed;
  }
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : getSeedCalendars();
  } catch (err) {
    return getSeedCalendars();
  }
}

function saveCalendars(calendars) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(calendars, null, 2), 'utf-8');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = reqUrl.pathname;

  // Handle API Requests: /api/index.php or /api/calendars
  if (pathname.startsWith('/api')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      let inputData = {};
      try {
        if (body) inputData = JSON.parse(body);
      } catch (e) {}

      const action = reqUrl.searchParams.get('action') || inputData.action || '';
      const calendars = getCalendars();

      if (action === 'list' || (!action && req.method === 'GET' && !reqUrl.searchParams.get('id'))) {
        const summaries = calendars.map(c => ({
          id: c.id,
          name: c.name || 'Sans titre',
          author: c.author || 'Anonyme',
          description: c.description || '',
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          courseCount: Array.isArray(c.selectedCourseKeys) ? c.selectedCourseKeys.length : (c.courseCount || 0),
          totalCredits: c.totalCredits || 0
        })).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, calendars: summaries }));
        return;
      }

      if (action === 'get' || (!action && req.method === 'GET' && reqUrl.searchParams.get('id'))) {
        const id = reqUrl.searchParams.get('id') || inputData.id;
        const found = calendars.find(c => c.id === id);
        if (found) {
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, calendar: found }));
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ success: false, error: 'Calendrier introuvable' }));
        }
        return;
      }

      if (action === 'create' || (req.method === 'POST' && !reqUrl.searchParams.get('id'))) {
        const name = (inputData.name || 'Mon Calendrier').trim();
        const author = (inputData.author || 'Étudiant').trim();
        const description = (inputData.description || '').trim();
        const newId = `cal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const now = new Date().toISOString();

        const selectedCourseKeys = Array.isArray(inputData.selectedCourseKeys) ? inputData.selectedCourseKeys : [];
        const newCal = {
          id: newId,
          name,
          author,
          description,
          createdAt: now,
          updatedAt: now,
          selectedCourseKeys,
          categoryOverrides: inputData.categoryOverrides || {},
          ratings: inputData.ratings || {},
          comments: inputData.comments || {},
          customCourses: inputData.customCourses || [],
          courseCount: selectedCourseKeys.length,
          totalCredits: parseFloat(inputData.totalCredits || 0)
        };

        calendars.push(newCal);
        saveCalendars(calendars);

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, calendar: newCal }));
        return;
      }

      if (action === 'update' || (req.method === 'POST' && reqUrl.searchParams.get('id'))) {
        const id = reqUrl.searchParams.get('id') || inputData.id;
        const idx = calendars.findIndex(c => c.id === id);
        if (idx !== -1) {
          const existing = calendars[idx];
          const updated = {
            ...existing,
            ...inputData,
            updatedAt: new Date().toISOString(),
            courseCount: Array.isArray(inputData.selectedCourseKeys) ? inputData.selectedCourseKeys.length : existing.courseCount
          };
          calendars[idx] = updated;
          saveCalendars(calendars);

          res.writeHead(200);
          res.end(JSON.stringify({ success: true, calendar: updated }));
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ success: false, error: 'Calendrier introuvable' }));
        }
        return;
      }

      if (action === 'delete') {
        const id = reqUrl.searchParams.get('id') || inputData.id;
        const filtered = calendars.filter(c => c.id !== id);
        saveCalendars(filtered);

        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'Calendrier supprimé' }));
        return;
      }

      res.writeHead(200);
      res.end(JSON.stringify({ success: true, api: 'Node.js Calendar API', version: '1.0' }));
    });
    return;
  }

  // Static File Serving
  let filePath = path.join(DIST_DIR, pathname === '/' ? 'index.html' : pathname);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_DIR, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Erreur serveur');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Serveur KU Sejong en ligne sur http://localhost:${PORT}`);
});
