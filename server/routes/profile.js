import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

function validatePassword(password) {
  if (!password || typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  if (password.length > 128) {
    return 'Password must not exceed 128 characters';
  }
  return null;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT id, username, display_name, is_admin, created_at FROM users WHERE id = $1',
      [req.userId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/', requireAuth, async (req, res) => {
  const { display_name, current_password, new_password } = req.body;

  if (display_name !== undefined && (typeof display_name !== 'string' || display_name.length > 100)) {
    return res.status(400).json({ error: 'Display name must be a string up to 100 characters' });
  }

  try {
    const { rows: userRows } = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.userId]
    );
    if (userRows.length === 0) return res.status(404).json({ error: 'User not found' });

    const updates = [];
    const values = [];
    let idx = 1;
    let passwordChanged = false;

    if (display_name !== undefined) {
      updates.push(`display_name = $${idx++}`);
      values.push(display_name);
    }

    if (new_password) {
      if (!current_password) {
        return res.status(400).json({ error: 'Current password required to change password' });
      }
      const pwdError = validatePassword(new_password);
      if (pwdError) {
        return res.status(400).json({ error: pwdError });
      }
      const valid = await bcrypt.compare(current_password, userRows[0].password_hash);
      if (!valid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      const hash = await bcrypt.hash(new_password, 12);
      updates.push(`password_hash = $${idx++}`);
      values.push(hash);
      passwordChanged = true;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.userId);
    const { rows } = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}
       RETURNING id, username, display_name, is_admin, created_at`,
      values
    );

    // If password was changed, revoke all API tokens as a security measure
    if (passwordChanged) {
      await query('DELETE FROM api_tokens WHERE user_id = $1', [req.userId]);
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
