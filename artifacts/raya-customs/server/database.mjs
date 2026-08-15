import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
import { PRIVATE_RUNTIME } from './privateConfig.mjs';

const { Pool } = pg;
const connectionString = String(process.env.RAYA_DATABASE_URL || '').trim();
const databaseHost = connectionString ? new URL(connectionString).hostname.toLowerCase() : '';
const isLocalDatabase = ['localhost', '127.0.0.1', '::1'].includes(databaseHost);
let pool;

export function databaseEnabled() {
  return Boolean(connectionString);
}

export function getDatabase() {
  if (!connectionString) throw new Error('database_not_configured');
  if (!pool) {
    pool = new Pool({
      connectionString,
      max: Number(process.env.RAYA_DATABASE_POOL_SIZE || 10),
      ssl: PRIVATE_RUNTIME.isProduction && !isLocalDatabase ? { rejectUnauthorized: true } : undefined,
      application_name: 'raya-private-platform',
    });
  }
  return pool;
}

export async function databaseHealth() {
  if (!databaseEnabled()) return { configured: false, reachable: false };
  const result = await getDatabase().query('SELECT current_database() AS database, now() AS checked_at');
  return { configured: true, reachable: true, database: result.rows[0].database, checkedAt: result.rows[0].checked_at };
}

export async function runMigrations() {
  const db = getDatabase();
  const migrationDirectory = new URL('../db/migrations/', import.meta.url);
  const names = (await readdir(migrationDirectory))
    .filter((name) => /^\d+.*\.sql$/.test(name))
    .sort();
  await db.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const results = [];

  for (const name of names) {
    const applied = await db.query('SELECT 1 FROM schema_migrations WHERE name = $1', [name]);
    if (applied.rowCount) {
      results.push({ applied: false, name });
      continue;
    }
    const sql = await readFile(new URL(name, migrationDirectory), 'utf8');
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      results.push({ applied: true, name });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  return results;
}

export async function closeDatabase() {
  if (pool) await pool.end();
  pool = undefined;
}
