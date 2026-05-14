import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT id, name, last_used_at, created_at
       FROM api_tokens WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('List tokens error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body;
  try {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const { rows } = await query(
      `INSERT INTO api_tokens (user_id, token_hash, name)
       VALUES ($1, $2, $3)
       RETURNING id, name, last_used_at, created_at`,
      [req.userId, tokenHash, name || 'iOS Shortcut']
    );
    res.status(201).json({ ...rows[0], token });
  } catch (err) {
    console.error('Create token error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await query('DELETE FROM api_tokens WHERE id = $1 AND user_id = $2', [req.params.id, req.userId]);
    res.status(204).send();
  } catch (err) {
    console.error('Delete token error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
