import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db.js';
import { requireAuth, verifyToken } from '../auth.js';

const router = Router();
const DEDUP_MINUTES = 30;

// Helper to authenticate via Bearer token (JWT session or API token)
async function authenticateRequest(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice(7);

  // Try JWT first
  const decoded = verifyToken(token);
  if (decoded) {
    req.userId = decoded.sub;
    req.user = decoded;
    return next();
  }

  // Try API token
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const { rows } = await query(
    `SELECT t.user_id, u.username, u.display_name, u.is_admin, u.is_disabled
     FROM api_tokens t
     JOIN users u ON u.id = t.user_id
     WHERE t.token_hash = $1`,
    [tokenHash]
  );

  if (rows.length === 0 || rows[0].is_disabled) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.userId = rows[0].user_id;
  req.user = {
    sub: rows[0].user_id,
    username: rows[0].username,
    display_name: rows[0].display_name,
    is_admin: rows[0].is_admin,
  };

  // Update last_used
  await query('UPDATE api_tokens SET last_used_at = NOW() WHERE token_hash = $1', [tokenHash]);

  next();
}

// Log a visit (called by iOS Shortcut)
router.post('/', authenticateRequest, async (req, res) => {
  const { location_id, timestamp, timezone } = req.body;
  if (!location_id) {
    return res.status(400).json({ error: 'location_id required' });
  }

  try {
    // Verify location belongs to user
    const { rows: locRows } = await query(
      'SELECT user_id FROM locations WHERE id = $1',
      [location_id]
    );
    if (locRows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    if (locRows[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const visitedAt = timestamp ? new Date(timestamp) : new Date();

    // Deduplication: check for recent visit to same location
    const { rows: recent } = await query(
      `SELECT id FROM visits
       WHERE location_id = $1 AND user_id = $2 AND visited_at > $3
       LIMIT 1`,
      [location_id, req.userId, new Date(visitedAt.getTime() - DEDUP_MINUTES * 60000)]
    );

    if (recent.length > 0) {
      return res.status(409).json({ error: 'Duplicate visit: already logged within 30 minutes' });
    }

    const { rows } = await query(
      `INSERT INTO visits (location_id, user_id, visited_at)
       VALUES ($1, $2, $3)
       RETURNING id, location_id, user_id, visited_at`,
      [location_id, req.userId, visitedAt]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Log visit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get visit history
router.get('/', requireAuth, async (req, res) => {
  const { start, end, location_id } = req.query;

  try {
    let sql = `SELECT v.id, v.location_id, v.visited_at, v.created_at,
                      l.name as location_name
               FROM visits v
               JOIN locations l ON l.id = v.location_id
               WHERE v.user_id = $1`;
    const params = [req.userId];
    let idx = 2;

    if (start) {
      sql += ` AND v.visited_at >= $${idx++}`;
      params.push(new Date(start));
    }
    if (end) {
      sql += ` AND v.visited_at <= $${idx++}`;
      params.push(new Date(end));
    }
    if (location_id) {
      sql += ` AND v.location_id = $${idx++}`;
      params.push(location_id);
    }

    sql += ' ORDER BY v.visited_at DESC';

    const { rows } = await query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Get visits error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
