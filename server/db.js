import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgres://localhost/visittracker';
const useSsl =
  process.env.DATABASE_SSL === 'true' ||
  connectionString.includes('sslmode=require') ||
  Boolean(process.env.VERCEL);

const pool =
  globalThis.__vtPool ||
  new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : false,
    max: process.env.VERCEL ? 1 : 10,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 5000,
  });

if (!globalThis.__vtPool) {
  globalThis.__vtPool = pool;
}

export async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log('Executed query', { text: text.slice(0, 60), duration, rows: result.rowCount });
  }
  return result;
}

export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export { pool };
