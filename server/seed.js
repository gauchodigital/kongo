import fs from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import { createItem, listItems, upsertAdmin } from './store.js';
import { closePool } from './db.js';

const seed = JSON.parse(await fs.readFile(new URL('./seed-data.json', import.meta.url), 'utf8'));
let inserted = 0;

for (const items of Object.values(seed)) {
  for (const item of items) {
    const existing = (await listItems({ type: item.type, q: item.slug, limit: 1000 })).items
      .find((candidate) => candidate.slug === item.slug);
    if (!existing) {
      await createItem(item, null);
      inserted += 1;
    }
  }
}

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
if (email && password) {
  if (password.length < 12) throw new Error('ADMIN_PASSWORD debe tener al menos 12 caracteres.');
  await upsertAdmin({
    email,
    name: process.env.ADMIN_NAME || 'Administrador Kongo',
    passwordHash: await bcrypt.hash(password, 12)
  });
  console.log(`Usuario administrador preparado: ${email}`);
} else {
  console.warn('ADMIN_EMAIL/ADMIN_PASSWORD no definidos; no se creó el usuario inicial.');
}

await closePool();
console.log(`Seed completado: ${inserted} contenidos nuevos.`);
