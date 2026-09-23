import fs from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { getPool } from './db.js';
import { upsertAdmin } from './store.js';

export async function initializeDatabase() {
  const pool = getPool();
  const schema = await fs.readFile(new URL('./schema.sql', import.meta.url), 'utf8');
  const statements = schema.split(/;\s*(?:\r?\n|$)/).map((value) => value.trim()).filter(Boolean);
  for (const statement of statements) await pool.query(statement);

  const seed = JSON.parse(await fs.readFile(new URL('./seed-data.json', import.meta.url), 'utf8'));
  const records = Object.values(seed).flat();
  const sql = `INSERT IGNORE INTO content_items
    (external_id, type, slug, status, title, summary, data, sort_order, published_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  for (const item of records) {
    await pool.execute(sql, [
      item.id || null, item.type, item.slug, item.status, item.title, item.summary || null,
      JSON.stringify(item.data || {}), item.sortOrder || 0, item.publishedAt || null
    ]);
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (email && password && password.length >= 12) {
    await upsertAdmin({
      email,
      name: process.env.ADMIN_NAME || 'Administrador Kongo',
      passwordHash: await bcrypt.hash(password, 12)
    });
  }
}
