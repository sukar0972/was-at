import { query, pool } from './db.js';

const migrations = [
  {
    id: 1,
    name: 'create_users_table',
    sql: `
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        is_admin BOOLEAN DEFAULT FALSE,
        is_disabled BOOLEAN DEFAULT FALSE,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMPTZ,
        api_token_hash VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,
  },
  {
    id: 2,
    name: 'create_locations_table',
    sql: `
      CREATE TABLE IF NOT EXISTS locations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        address TEXT,
        latitude DECIMAL(10, 8),
        longitude DECIMAL(11, 8),
        radius_meters INTEGER DEFAULT 100,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,
  },
  {
    id: 3,
    name: 'create_visits_table',
    sql: `
      CREATE TABLE IF NOT EXISTS visits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        visited_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,
  },
  {
    id: 4,
    name: 'create_visits_indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_visits_user_id ON visits(user_id);
      CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON visits(visited_at);
      CREATE INDEX IF NOT EXISTS idx_visits_location_id ON visits(location_id);
      CREATE INDEX IF NOT EXISTS idx_visits_user_date ON visits(user_id, visited_at);
    `,
  },
  {
    id: 5,
    name: 'create_api_tokens_table',
    sql: `
      CREATE TABLE IF NOT EXISTS api_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        name VARCHAR(100),
        last_used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `,
  },
];

async function runMigrations() {
  console.log('Running migrations...');

  // Create migrations tracking table
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  for (const migration of migrations) {
    const { rows } = await query('SELECT id FROM migrations WHERE id = $1', [migration.id]);
    if (rows.length > 0) {
      console.log(`  ✓ ${migration.name} (already applied)`);
      continue;
    }

    await query('BEGIN');
    try {
      await query(migration.sql);
      await query('INSERT INTO migrations (id, name) VALUES ($1, $2)', [migration.id, migration.name]);
      await query('COMMIT');
      console.log(`  ✓ ${migration.name} (applied)`);
    } catch (err) {
      await query('ROLLBACK');
      console.error(`  ✗ ${migration.name} failed:`, err.message);
      throw err;
    }
  }

  console.log('Migrations complete.');
  await pool.end();
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
