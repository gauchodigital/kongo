import mysql from 'mysql2/promise';
import { dbConfig, useMemoryStore } from './config.js';

let pool;

export function getPool() {
  if (useMemoryStore) return null;
  if (!pool) pool = mysql.createPool(dbConfig);
  return pool;
}

export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
