import bcrypt from 'bcryptjs';
import { query, pool } from './db.js';

const command = process.argv[2];

function validatePassword(password) {
  if (!password || typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
}

async function createAdmin() {
  const username = process.argv[3];
  const password = process.argv[4];
  const displayName = process.argv[5] || username;

  if (!username || !password) {
    console.error('Usage: node cli.js create-admin <username> <password> [display_name]');
    process.exit(1);
  }

  const pwdError = validatePassword(password);
  if (pwdError) {
    console.error(pwdError);
    process.exit(1);
  }

  try {
    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0) {
      console.error(`User "${username}" already exists.`);
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (username, password_hash, display_name, is_admin)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id, username, display_name, is_admin, created_at`,
      [username, hash, displayName]
    );

    console.log('Admin user created successfully:');
    console.log(`  ID:       ${rows[0].id}`);
    console.log(`  Username: ${rows[0].username}`);
    console.log(`  Name:     ${rows[0].display_name}`);
    console.log(`  Admin:    ${rows[0].is_admin}`);
    console.log(`  Created:  ${rows[0].created_at}`);
  } catch (err) {
    console.error('Failed to create admin:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

switch (command) {
  case 'create-admin':
    createAdmin();
    break;
  default:
    console.log('Usage:');
    console.log('  node cli.js create-admin <username> <password> [display_name]');
    process.exit(0);
}
