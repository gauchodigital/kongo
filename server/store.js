import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { getPool } from './db.js';
import { rootDir, useMemoryStore } from './config.js';

const seed = JSON.parse(await fs.readFile(new URL('./seed-data.json', import.meta.url), 'utf8'));
const typeToGroup = { product: 'products', post: 'posts', shelter: 'shelters', faq: 'faqs', page: 'pages' };
const validTypes = Object.keys(typeToGroup);

const memory = {
  items: Object.values(seed).flat().map((item) => ({
    ...structuredClone(item),
    dbId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  })),
  users: [],
  media: [],
  audit: []
};

function fromRow(row) {
  const data = typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
  return {
    dbId: String(row.id),
    id: row.external_id || String(row.id),
    type: row.type,
    slug: row.slug,
    status: row.status,
    title: row.title,
    summary: row.summary || '',
    data,
    sortOrder: row.sort_order,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function matches(item, { type, status, q }) {
  const needle = String(q || '').trim().toLocaleLowerCase('es');
  return (!type || item.type === type)
    && (!status || item.status === status)
    && (!needle || `${item.title} ${item.summary} ${item.slug}`.toLocaleLowerCase('es').includes(needle));
}

export async function listItems(filters = {}) {
  const page = Math.max(1, Number(filters.page || 1));
  const limit = Math.min(1000, Math.max(1, Number(filters.limit || 20)));
  if (useMemoryStore) {
    const found = memory.items.filter((item) => matches(item, filters))
      .sort((a, b) => a.sortOrder - b.sortOrder || String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return { items: found.slice((page - 1) * limit, page * limit), total: found.length, page, limit };
  }

  const clauses = [];
  const params = [];
  if (filters.type) { clauses.push('type = ?'); params.push(filters.type); }
  if (filters.status) { clauses.push('status = ?'); params.push(filters.status); }
  if (filters.q) {
    clauses.push('(title LIKE ? OR summary LIKE ? OR slug LIKE ?)');
    const like = `%${filters.q}%`;
    params.push(like, like, like);
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const pool = getPool();
  const [[count]] = await pool.query(`SELECT COUNT(*) total FROM content_items ${where}`, params);
  const [rows] = await pool.query(
    `SELECT * FROM content_items ${where} ORDER BY sort_order ASC, updated_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );
  return { items: rows.map(fromRow), total: count.total, page, limit };
}

export async function getItem(id) {
  if (useMemoryStore) return memory.items.find((item) => item.dbId === String(id)) || null;
  const [rows] = await getPool().query('SELECT * FROM content_items WHERE id = ?', [id]);
  return rows[0] ? fromRow(rows[0]) : null;
}

export async function createItem(input, userId) {
  if (!validTypes.includes(input.type)) throw new Error('Tipo de contenido inválido');
  const now = new Date().toISOString();
  if (useMemoryStore) {
    const item = { ...structuredClone(input), dbId: crypto.randomUUID(), id: input.id || crypto.randomUUID(), createdAt: now, updatedAt: now };
    memory.items.push(item);
    return item;
  }
  const [result] = await getPool().execute(
    `INSERT INTO content_items
      (external_id, type, slug, status, title, summary, data, sort_order, published_at, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.id || null, input.type, input.slug, input.status, input.title, input.summary || null,
      JSON.stringify(input.data || {}), input.sortOrder || 0, input.publishedAt || null, userId, userId]
  );
  return getItem(result.insertId);
}

export async function updateItem(id, input, userId) {
  const current = await getItem(id);
  if (!current) return null;
  const merged = { ...current, ...structuredClone(input), updatedAt: new Date().toISOString() };
  if (useMemoryStore) {
    const index = memory.items.findIndex((item) => item.dbId === String(id));
    memory.items[index] = merged;
    return merged;
  }
  await getPool().execute(
    `UPDATE content_items SET slug=?, status=?, title=?, summary=?, data=?, sort_order=?,
      published_at=?, updated_by=? WHERE id=?`,
    [merged.slug, merged.status, merged.title, merged.summary || null, JSON.stringify(merged.data || {}),
      merged.sortOrder || 0, merged.publishedAt || null, userId, id]
  );
  return getItem(id);
}

export async function deleteItem(id) {
  if (useMemoryStore) {
    const index = memory.items.findIndex((item) => item.dbId === String(id));
    if (index < 0) return false;
    memory.items.splice(index, 1);
    return true;
  }
  const [result] = await getPool().execute('DELETE FROM content_items WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function getPublicContent() {
  const published = (await listItems({ status: 'published', limit: 1000 })).items;
  const scheduled = (await listItems({ status: 'scheduled', limit: 1000 })).items
    .filter((item) => item.publishedAt && new Date(item.publishedAt) <= new Date());
  const grouped = { products: [], posts: [], shelters: [], faqs: [], pages: [] };
  for (const item of [...published, ...scheduled]) grouped[typeToGroup[item.type]].push(item);
  return {
    products: grouped.products.map((item) => ({ ...item.data, id: item.id || item.data.id })),
    posts: grouped.posts.map((item) => ({ ...item.data, id: item.id || item.data.id, slug: item.slug })),
    shelters: grouped.shelters.map((item) => item.data),
    faqs: grouped.faqs.map((item) => item.data),
    pages: Object.fromEntries(grouped.pages.map((item) => [item.slug, item.data])),
    generatedAt: new Date().toISOString()
  };
}

export async function findUserByEmail(email) {
  if (useMemoryStore) return memory.users.find((user) => user.email === email.toLowerCase()) || null;
  const [rows] = await getPool().query('SELECT * FROM users WHERE email = ? AND is_active = 1', [email.toLowerCase()]);
  return rows[0] || null;
}

export async function findUserById(id) {
  if (useMemoryStore) return memory.users.find((user) => String(user.id) === String(id)) || null;
  const [rows] = await getPool().query('SELECT id, email, name, role, is_active FROM users WHERE id = ? AND is_active = 1', [id]);
  return rows[0] || null;
}

export async function upsertAdmin({ email, name, passwordHash }) {
  if (useMemoryStore) {
    const existing = await findUserByEmail(email);
    if (existing) Object.assign(existing, { name, password_hash: passwordHash, role: 'admin' });
    else memory.users.push({ id: memory.users.length + 1, email: email.toLowerCase(), name, password_hash: passwordHash, role: 'admin', is_active: 1 });
    return;
  }
  await getPool().execute(
    `INSERT INTO users (email, name, password_hash, role) VALUES (?, ?, ?, 'admin')
     ON DUPLICATE KEY UPDATE name=VALUES(name), password_hash=VALUES(password_hash), role='admin', is_active=1`,
    [email.toLowerCase(), name, passwordHash]
  );
}

export async function listUsers() {
  if (useMemoryStore) return memory.users.map(({ password_hash, ...user }) => user);
  const [rows] = await getPool().query(
    'SELECT id, email, name, role, is_active, last_login_at, created_at FROM users ORDER BY name'
  );
  return rows;
}

export async function hasUsers() {
  if (useMemoryStore) return memory.users.length > 0;
  const [[row]] = await getPool().query('SELECT EXISTS(SELECT 1 FROM users LIMIT 1) present');
  return Boolean(row.present);
}

export async function createUser({ email, name, role, passwordHash }) {
  if (useMemoryStore) {
    if (await findUserByEmail(email)) throw new Error('El email ya está registrado');
    const user = { id: memory.users.length + 1, email: email.toLowerCase(), name, role, password_hash: passwordHash, is_active: 1 };
    memory.users.push(user);
    const { password_hash, ...safe } = user;
    return safe;
  }
  const [result] = await getPool().execute(
    'INSERT INTO users (email, name, role, password_hash) VALUES (?, ?, ?, ?)',
    [email.toLowerCase(), name, role, passwordHash]
  );
  return findUserById(result.insertId);
}

export async function updateLastLogin(id) {
  if (useMemoryStore) return;
  await getPool().execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
}

export async function createMedia(input) {
  if (useMemoryStore) {
    const item = { id: crypto.randomUUID(), ...input, createdAt: new Date().toISOString() };
    memory.media.unshift(item);
    return item;
  }
  const [result] = await getPool().execute(
    `INSERT INTO media (filename, original_name, mime_type, size_bytes, width, height, alt_text, path, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [input.filename, input.originalName, input.mimeType, input.sizeBytes, input.width, input.height,
      input.altText || '', input.path, input.createdBy || null]
  );
  const [rows] = await getPool().query('SELECT * FROM media WHERE id = ?', [result.insertId]);
  return rows[0];
}

export async function listMedia() {
  if (useMemoryStore) return memory.media;
  const [rows] = await getPool().query('SELECT * FROM media ORDER BY created_at DESC LIMIT 500');
  return rows;
}

export async function addAudit(userId, action, entityType, entityId, details, ip) {
  if (useMemoryStore) {
    memory.audit.unshift({ id: crypto.randomUUID(), userId, action, entityType, entityId, details, ip, createdAt: new Date().toISOString() });
    return;
  }
  await getPool().execute(
    'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
    [userId || null, action, entityType, entityId || null, JSON.stringify(details || {}), ip || null]
  );
}

export async function listAudit(limit = 20) {
  if (useMemoryStore) return memory.audit.slice(0, limit);
  const [rows] = await getPool().query(
    `SELECT a.*, u.name user_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
     ORDER BY a.created_at DESC LIMIT ?`, [Number(limit)]
  );
  return rows;
}

export async function stats() {
  const byType = Object.fromEntries(validTypes.map((type) => [type, 0]));
  if (useMemoryStore) {
    for (const item of memory.items) byType[item.type] += 1;
    return { total: memory.items.length, byType };
  }
  const [rows] = await getPool().query('SELECT type, COUNT(*) total FROM content_items GROUP BY type');
  for (const row of rows) byType[row.type] = row.total;
  return { total: rows.reduce((sum, row) => sum + Number(row.total), 0), byType };
}

export async function duplicateItem(id, userId) {
  const current = await getItem(id);
  if (!current) return null;
  const stamp = Date.now().toString(36);
  return createItem({
    id: current.id ? `${current.id}-copia` : undefined,
    type: current.type,
    slug: `${current.slug}-copia-${stamp}`,
    status: 'draft',
    title: `${current.title} (copia)`,
    summary: current.summary,
    data: structuredClone(current.data || {}),
    sortOrder: current.sortOrder || 0,
    publishedAt: null
  }, userId);
}

export const paths = { rootDir };
