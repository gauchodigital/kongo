import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import { assertProductionConfig, isProduction, port, rootDir, uploadDir, useMemoryStore } from './config.js';
import { router } from './routes.js';
import { MySqlSessionStore } from './session-store.js';
import { upsertAdmin } from './store.js';
import { initializeDatabase } from './initialize.js';

assertProductionConfig();
await fs.mkdir(uploadDir, { recursive: true });
if (!useMemoryStore) await initializeDatabase();
if (useMemoryStore && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
  await upsertAdmin({
    email: process.env.ADMIN_EMAIL,
    name: process.env.ADMIN_NAME || 'Administrador Kongo',
    passwordHash: await bcrypt.hash(process.env.ADMIN_PASSWORD, 12)
  });
}

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((_req, res, next) => {
  if (process.env.PUBLIC_INDEXING !== 'true') res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  next();
});
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

const sessionOptions = {
  name: 'kongo.sid',
  secret: process.env.SESSION_SECRET || (process.env.DATABASE_URL
    ? crypto.createHash('sha256').update(`kongo-session:${process.env.DATABASE_URL}`).digest('hex')
    : 'local-development-secret-change-before-deploy'),
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    maxAge: 8 * 60 * 60 * 1000
  }
};

if (!useMemoryStore) {
  sessionOptions.store = new MySqlSessionStore();
}

app.use(session(sessionOptions));
app.use('/api', router);
app.use('/uploads', express.static(path.join(rootDir, 'uploads'), { maxAge: '7d', immutable: false }));
app.get('/support.js', (_req, res) => res.sendFile(path.join(rootDir, 'support.js')));
app.get('/refugios.json', (_req, res) => res.sendFile(path.join(rootDir, 'refugios.json')));
app.get('/Kongo%20Formulario.dc.html', (_req, res) => res.sendFile(path.join(rootDir, 'Kongo Formulario.dc.html')));

app.use('/admin', express.static(path.join(rootDir, 'admin-dist'), { index: false, maxAge: isProduction ? '1h' : 0 }));
app.get('/admin/{*path}', (_req, res) => res.sendFile(path.join(rootDir, 'admin-dist', 'index.html')));
app.get('/', (_req, res) => res.sendFile(path.join(rootDir, 'index.html')));

app.use((error, _req, res, _next) => {
  const status = error.status || (error.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error(error);
  res.status(status).json({
    error: status >= 500 ? 'Ocurrió un error inesperado' : error.message,
    details: error.details
  });
});

const server = app.listen(port, () => {
  console.log(`Kongo CMS disponible en http://localhost:${port}`);
  if (useMemoryStore) console.log('Usando almacenamiento local en memoria. El panel está en /admin');
  else console.log('Dashboard: /admin');
});

function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
