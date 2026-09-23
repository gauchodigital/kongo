import fs from 'node:fs/promises';
import { getPool, closePool } from './db.js';
import { useMemoryStore } from './config.js';

if (useMemoryStore) {
  console.log('USE_MEMORY_STORE activo: no hay migraciones que ejecutar.');
  process.exit(0);
}

const sql = await fs.readFile(new URL('./schema.sql', import.meta.url), 'utf8');
const statements = sql.split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean);
const pool = getPool();

for (const statement of statements) await pool.query(statement);
await closePool();
console.log(`Migración completada (${statements.length} sentencias).`);
