import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import sharp from 'sharp';
import slugify from 'slugify';
import { rateLimit } from 'express-rate-limit';
import { uploadDir } from './config.js';
import {
  addAudit, createItem, createMedia, createUser, deleteItem, duplicateItem, findUserByEmail, findUserById,
  getItem, getPublicContent, hasUsers, listAudit, listItems, listMedia, listUsers, stats, updateItem, updateLastLogin
} from './store.js';
import { contentSchema, loginSchema, parse, userSchema } from './validation.js';

export const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Probá nuevamente en 15 minutos.' }
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    callback(allowed.includes(file.mimetype) ? null : new Error('Formato de imagen no permitido'), allowed.includes(file.mimetype));
  }
});

function csrfToken(req) {
  if (!req.session.csrfToken) req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  return req.session.csrfToken;
}

function requireCsrf(req, _res, next) {
  const provided = req.get('x-csrf-token');
  if (!provided || provided !== req.session.csrfToken) {
    const error = new Error('Token de seguridad inválido');
    error.status = 403;
    return next(error);
  }
  next();
}

async function requireAuth(req, _res, next) {
  if (!req.session.userId) {
    const error = new Error('Iniciá sesión para continuar');
    error.status = 401;
    return next(error);
  }
  const user = await findUserById(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    const error = new Error('La sesión ya no es válida');
    error.status = 401;
    return next(error);
  }
  req.user = user;
  next();
}

function requireAdmin(req, _res, next) {
  if (req.user?.role !== 'admin') {
    const error = new Error('Esta acción requiere rol administrador');
    error.status = 403;
    return next(error);
  }
  next();
}

router.get('/health', (_req, res) => res.json({ ok: true, service: 'kongo-cms' }));

router.get('/content', async (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await getPublicContent());
});

router.get('/auth/session', async (req, res) => {
  const user = req.session.userId ? await findUserById(req.session.userId) : null;
  res.json({ user, csrfToken: csrfToken(req), needsBootstrap: !(await hasUsers()) });
});

router.post('/auth/bootstrap', loginLimiter, requireCsrf, async (req, res) => {
  if (await hasUsers()) return res.status(409).json({ error: 'El panel ya tiene un administrador' });
  const input = parse(userSchema, { ...req.body, role: 'admin' });
  const user = await createUser({ ...input, role: 'admin', passwordHash: await bcrypt.hash(input.password, 12) });
  await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.userId = user.id;
  const token = csrfToken(req);
  await addAudit(user.id, 'bootstrap', 'user', String(user.id), { email: user.email }, req.ip);
  res.status(201).json({ user, csrfToken: token });
});

router.post('/auth/login', loginLimiter, requireCsrf, async (req, res) => {
  const input = parse(loginSchema, req.body);
  const user = await findUserByEmail(input.email);
  const valid = user && await bcrypt.compare(input.password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Email o contraseña incorrectos' });
  await new Promise((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
  req.session.userId = user.id;
  const token = csrfToken(req);
  await updateLastLogin(user.id);
  await addAudit(user.id, 'login', 'session', null, {}, req.ip);
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role }, csrfToken: token });
});

router.post('/auth/logout', requireAuth, requireCsrf, async (req, res) => {
  await addAudit(req.user.id, 'logout', 'session', null, {}, req.ip);
  req.session.destroy(() => res.status(204).end());
});

router.use('/admin', requireAuth);

router.get('/admin/dashboard', async (_req, res) => {
  res.json({ stats: await stats(), audit: await listAudit(12) });
});

router.get('/admin/content', async (req, res) => {
  res.json(await listItems(req.query));
});

router.get('/admin/content/:id', async (req, res) => {
  const item = await getItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'Contenido no encontrado' });
  res.json(item);
});

router.post('/admin/content', requireCsrf, async (req, res) => {
  const input = parse(contentSchema, req.body);
  const item = await createItem(input, req.user.id);
  await addAudit(req.user.id, 'create', input.type, item.dbId, { title: item.title }, req.ip);
  res.status(201).json(item);
});

router.put('/admin/content/:id', requireCsrf, async (req, res) => {
  const input = parse(contentSchema, req.body);
  const item = await updateItem(req.params.id, input, req.user.id);
  if (!item) return res.status(404).json({ error: 'Contenido no encontrado' });
  await addAudit(req.user.id, 'update', item.type, item.dbId, { title: item.title, status: item.status }, req.ip);
  res.json(item);
});

router.delete('/admin/content/:id', requireCsrf, async (req, res) => {
  const current = await getItem(req.params.id);
  if (!current) return res.status(404).json({ error: 'Contenido no encontrado' });
  await deleteItem(req.params.id);
  await addAudit(req.user.id, 'delete', current.type, req.params.id, { title: current.title }, req.ip);
  res.status(204).end();
});

router.post('/admin/content/:id/duplicate', requireCsrf, async (req, res) => {
  const item = await duplicateItem(req.params.id, req.user.id);
  if (!item) return res.status(404).json({ error: 'Contenido no encontrado' });
  await addAudit(req.user.id, 'duplicate', item.type, item.dbId, { title: item.title }, req.ip);
  res.status(201).json(item);
});

router.get('/admin/shelters.csv', async (_req, res) => {
  const { items } = await listItems({ type: 'shelter', limit: 1000 });
  const rows = [['provincia', 'localidad', 'nombre', 'instagram']];
  for (const item of items) {
    rows.push([item.data.prov || '', item.data.loc || '', item.data.name || item.title, item.data.ig || '']
      .map((value) => `"${String(value).replaceAll('"', '""')}"`));
  }
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="refugios-kongo.csv"');
  res.send('\uFEFF' + rows.map((row) => row.join(',')).join('\n'));
});

router.post('/admin/shelters/import', requireCsrf, express.text({ type: ['text/csv', 'text/plain', 'text/*'], limit: '2mb' }), async (req, res) => {
  const text = String(req.body || '');
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return res.status(422).json({ error: 'El CSV no tiene filas para importar' });
  const header = splitCsv(lines.shift()).map((value) => value.toLowerCase());
  const idx = {
    prov: header.findIndex((value) => /prov/.test(value)),
    loc: header.findIndex((value) => /loc/.test(value)),
    name: header.findIndex((value) => /nombre|name/.test(value)),
    ig: header.findIndex((value) => /insta|ig/.test(value))
  };
  if (idx.name < 0) return res.status(422).json({ error: 'Falta la columna de nombre' });
  let created = 0;
  for (const [index, line] of lines.entries()) {
    const cols = splitCsv(line);
    const name = cols[idx.name]?.trim();
    if (!name) continue;
    const data = {
      prov: cols[idx.prov] || '',
      loc: cols[idx.loc] || '',
      name,
      ig: String(cols[idx.ig] || '').replace(/^@/, '')
    };
    const slug = `shelter-import-${Date.now().toString(36)}-${index + 1}`;
    await createItem({
      type: 'shelter',
      slug,
      status: 'published',
      title: name,
      summary: `${data.loc}, ${data.prov}`.replace(/^, |, $/g, ''),
      data,
      sortOrder: 9000 + index
    }, req.user.id);
    created += 1;
  }
  await addAudit(req.user.id, 'import', 'shelter', null, { created }, req.ip);
  res.json({ created });
});

function splitCsv(line) {
  const out = [];
  let current = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      out.push(current.trim());
      current = '';
    } else current += char;
  }
  out.push(current.trim());
  return out;
}

router.get('/admin/media', async (_req, res) => res.json(await listMedia()));

router.post('/admin/media', requireCsrf, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(422).json({ error: 'Seleccioná una imagen' });
  await fs.mkdir(uploadDir, { recursive: true });
  const base = slugify(path.parse(req.file.originalname).name, { lower: true, strict: true }) || 'imagen';
  const filename = `${Date.now()}-${base}.webp`;
  const target = path.join(uploadDir, filename);
  const image = sharp(req.file.buffer, { animated: req.file.mimetype === 'image/gif' }).rotate();
  const metadata = await image.metadata();
  await image.resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toFile(target);
  const saved = await fs.stat(target);
  const media = await createMedia({
    filename,
    originalName: req.file.originalname,
    mimeType: 'image/webp',
    sizeBytes: saved.size,
    width: metadata.width,
    height: metadata.height,
    altText: String(req.body.altText || '').slice(0, 255),
    path: `/uploads/cms/${filename}`,
    createdBy: req.user.id
  });
  await addAudit(req.user.id, 'upload', 'media', String(media.id), { filename }, req.ip);
  res.status(201).json(media);
});

router.get('/admin/users', requireAdmin, async (_req, res) => res.json(await listUsers()));

router.post('/admin/users', requireAdmin, requireCsrf, async (req, res) => {
  const input = parse(userSchema, req.body);
  const user = await createUser({ ...input, passwordHash: await bcrypt.hash(input.password, 12) });
  await addAudit(req.user.id, 'create', 'user', String(user.id), { email: user.email, role: user.role }, req.ip);
  res.status(201).json(user);
});
