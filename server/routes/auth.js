import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { signToken, requireAuth, DUMMY_HASH } from '../auth.js';

const router = Router();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

router.get('/setup-status', async (_req, res) => {
  try {
    const { rows } = await query('SELECT COUNT(*)::int AS count FROM users');
    res.json({ needsSetup: rows[0].count === 0 });
  } catch (err) {
    console.error('Setup status error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/setup', async (req, res) => {
  const { username, password, display_name } = req.body;
  if (!username || typeof username !== 'string' || username.trim().length < 2 || username.length > 50) {
    return res.status(400).json({ error: 'Username must be between 2 and 50 characters' });
  }
  if (!password || typeof password !== 'string' || password.length < 8 || password.length > 128) {
    return res.status(400).json({ error: 'Password must be between 8 and 128 characters' });
  }

  const cleanUsername = username.trim();
  const cleanDisplayName = (display_name && typeof display_name === 'string' ? display_name.trim() : '') || cleanUsername;

  try {
    const hash = await bcrypt.hash(password, 12);
    const { rows } = await query(
      `INSERT INTO users (username, password_hash, display_name, is_admin)
       SELECT $1, $2, $3, TRUE
       WHERE NOT EXISTS (SELECT 1 FROM users)
       RETURNING id, username, display_name, is_admin`,
      [cleanUsername, hash, cleanDisplayName]
    );

    if (rows.length === 0) {
      return res.status(403).json({ error: 'Setup has already been completed' });
    }

    const user = rows[0];
    const token = signToken({
      sub: user.id,
      username: user.username,
      display_name: user.display_name,
      is_admin: user.is_admin,
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        is_admin: user.is_admin,
      },
    });
  } catch (err) {
    console.error('Setup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const { rows } = await query(
      `SELECT id, username, password_hash, display_name, is_admin, is_disabled,
              failed_login_attempts, locked_until
       FROM users WHERE username = $1`,
      [username]
    );

    if (rows.length === 0) {
      // Perform dummy bcrypt comparison to mitigate username enumeration via timing analysis
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    if (user.is_disabled) {
      return res.status(403).json({ error: 'Account disabled' });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const mins = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
      return res.status(429).json({ error: `Account locked. Try again in ${mins} minutes.` });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      const attempts = user.failed_login_attempts + 1;
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000);
        await query(
          'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
          [attempts, lockedUntil, user.id]
        );
        return res.status(429).json({
          error: `Too many failed attempts. Account locked for ${LOCKOUT_MINUTES} minutes.`,
        });
      }
      await query('UPDATE users SET failed_login_attempts = $1 WHERE id = $2', [attempts, user.id]);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1', [user.id]);

    const token = signToken({
      sub: user.id,
      username: user.username,
      display_name: user.display_name,
      is_admin: user.is_admin,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        display_name: user.display_name,
        is_admin: user.is_admin,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, username, display_name, is_admin, is_disabled, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (rows.length === 0 || rows[0].is_disabled) {
      return res.status(401).json({ error: 'Account disabled or deleted' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
