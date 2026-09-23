import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile() {
  const envPath = path.join(rootDir, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

if (process.env.VERCEL) {
  process.env.USE_MEMORY_STORE = 'true';
  process.env.PUBLIC_INDEXING = process.env.PUBLIC_INDEXING || 'false';
  process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || '/tmp/kongo-cms';
  if (String(process.env.SESSION_SECRET || '').length < 32) {
    process.env.SESSION_SECRET = 'kongo-vercel-test-session-secret-min-32';
  }
}

export const port = Number(process.env.PORT || 3010);
export const useMemoryStore = process.env.USE_MEMORY_STORE === 'true' || !process.env.DB_HOST;
export const isProduction = process.env.NODE_ENV === 'production';
export const uploadDir = process.env.UPLOAD_DIR || path.join(rootDir, 'uploads', 'cms');

export const dbConfig = {
  host: !process.env.DB_HOST || process.env.DB_HOST === 'localhost' ? '127.0.0.1' : process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  charset: 'utf8mb4',
  timezone: 'Z',
  connectionLimit: 10
};

export function assertProductionConfig() {
  if (!isProduction) return;
  if (String(process.env.SESSION_SECRET || '').length < 32) {
    throw new Error('SESSION_SECRET debe tener al menos 32 caracteres.');
  }
  if (useMemoryStore) return;
  const required = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) throw new Error(`Faltan variables requeridas: ${missing.join(', ')}`);
}
