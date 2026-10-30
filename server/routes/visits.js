import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db.js';
import { requireAuth, verifyToken } from '../auth.js';

const router = Router();
const DEDUP_MINUTES = 30;

// Helper to authenticate via Bearer token or ?token= query param (JWT session or API token)
async function authenticateRequest(req, res, next) {
  try {
    const header = req.headers.authorization;
    const rawToken =
      header && header.startsWith('Bearer ')
        ? header.slice(7).trim()
        : req.query?.token || req.body?.token;

    if (!rawToken || typeof rawToken !== 'string') {
      return res.status(401).json({ error: 'Unauthorized: missing token' });
    }

    // Try JWT first
    const decoded = verifyToken(rawToken);
    if (decoded) {
      req.userId = decoded.sub;
      req.user = decoded;
      return next();
    }

    // Try API token
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
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
  } catch (err) {
    next(err);
  }
}

async function resolveOrCreateLocation(userId, { locationId, locationName }) {
  if (locationId) {
    const { rows } = await query(
      'SELECT id, name, user_id FROM locations WHERE id = $1',
      [locationId]
    );
    if (rows.length === 0) return { error: 'Location not found', status: 404 };
    if (rows[0].user_id !== userId) return { error: 'Forbidden', status: 403 };
    return { location: rows[0] };
  }

  if (locationName && typeof locationName === 'string') {
    const cleanName = locationName.trim().slice(0, 100);
    if (!cleanName) {
      return { error: 'Location name cannot be empty', status: 400 };
    }

    const { rows: existing } = await query(
      `SELECT id, name, user_id FROM locations
       WHERE user_id = $1 AND LOWER(name) = LOWER($2)
       LIMIT 1`,
      [userId, cleanName]
    );
    if (existing.length > 0) {
      return { location: existing[0] };
    }

    const { rows: created } = await query(
      `INSERT INTO locations (user_id, name, address, latitude, longitude, radius_meters)
       VALUES ($1, $2, '', 0, 0, 100)
       RETURNING id, name, user_id`,
      [userId, cleanName]
    );
    return { location: created[0], created: true };
  }

  return { error: 'Provide location_id or name', status: 400 };
}

async function handleVisitLog(req, res, { softDuplicate = false } = {}) {
  const locationId = req.body?.location_id || req.query?.location_id;
  const locationName =
    req.body?.name || req.body?.location || req.query?.name || req.query?.location;
  const rawTimestamp = req.body?.timestamp || req.query?.timestamp;

  const visitedAt = rawTimestamp ? new Date(rawTimestamp) : new Date();
  if (isNaN(visitedAt.getTime())) {
    return res.status(400).json({ error: 'Invalid timestamp' });
  }

  try {
    const resolved = await resolveOrCreateLocation(req.userId, { locationId, locationName });
    if (resolved.error) {
      return res.status(resolved.status).json({ error: resolved.error });
    }

    const { location } = resolved;
    const dedupCutoff = new Date(visitedAt.getTime() - DEDUP_MINUTES * 60000);
    const { rows } = await query(
      `INSERT INTO visits (location_id, user_id, visited_at)
       SELECT $1, $2, $3
       WHERE NOT EXISTS (
         SELECT 1 FROM visits
         WHERE location_id = $1 AND user_id = $2 AND visited_at > $4
       )
       RETURNING id, location_id, user_id, visited_at`,
      [location.id, req.userId, visitedAt, dedupCutoff]
    );

    if (rows.length === 0) {
      if (softDuplicate) {
        return res.status(200).json({
          ok: true,
          duplicate: true,
          location_name: location.name,
          message: 'Already logged within 30 minutes',
        });
      }
      return res.status(409).json({ error: 'Duplicate visit: already logged within 30 minutes' });
    }

    res.status(201).json({
      ...rows[0],
      ok: true,
      location_name: location.name,
    });
  } catch (err) {
    console.error('Log visit error:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

// 1-step iOS Shortcut endpoint (works with simple GET or POST URL)
router.get('/hit', authenticateRequest, (req, res) =>
  handleVisitLog(req, res, { softDuplicate: true })
);
router.post('/hit', authenticateRequest, (req, res) =>
  handleVisitLog(req, res, { softDuplicate: true })
);

// Standard REST endpoint
router.post('/', authenticateRequest, (req, res) =>
  handleVisitLog(req, res, { softDuplicate: false })
);

// Get visit history
router.get('/', requireAuth, async (req, res) => {
  const { start, end, location_id } = req.query;

  try {
    let sql = `SELECT v.id, v.location_id, v.visited_at, v.visited_at AS timestamp, v.created_at,
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
      const endDate = new Date(end);
      if (/^\d{4}-\d{2}-\d{2}$/.test(end)) {
        endDate.setUTCHours(23, 59, 59, 999);
      }
      sql += ` AND v.visited_at <= $${idx++}`;
      params.push(endDate);
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
