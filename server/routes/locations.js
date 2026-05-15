import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

function validateCoords(lat, lng, radius) {
  const latVal = parseFloat(lat);
  const lngVal = parseFloat(lng);
  const radiusVal = parseInt(radius);
  if (isNaN(latVal) || latVal < -90 || latVal > 90) {
    return 'Invalid latitude (must be between -90 and 90)';
  }
  if (isNaN(lngVal) || lngVal < -180 || lngVal > 180) {
    return 'Invalid longitude (must be between -180 and 180)';
  }
  if (isNaN(radiusVal) || radiusVal < 1 || radiusVal > 100000) {
    return 'Invalid radius (must be between 1 and 100000 meters)';
  }
  return null;
}

router.get('/', requireAuth, async (req, res) => {
  try {
    const { rows } = await query(
      `SELECT l.*, COUNT(v.id) as visit_count
       FROM locations l
       LEFT JOIN visits v ON v.location_id = l.id
       WHERE l.user_id = $1
       GROUP BY l.id
       ORDER BY l.created_at DESC`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('List locations error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  const { name, address, lat, lng, radius } = req.body;
  if (!name || typeof name !== 'string' || name.length > 100) {
    return res.status(400).json({ error: 'Name is required and must be up to 100 characters' });
  }

  const coordError = validateCoords(lat, lng, radius);
  if (coordError) {
    return res.status(400).json({ error: coordError });
  }

  try {
    const { rows } = await query(
      `INSERT INTO locations (user_id, name, address, latitude, longitude, radius_meters)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.userId, name, address || '', parseFloat(lat), parseFloat(lng), parseInt(radius)]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Create location error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { name, address, lat, lng, radius } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.length > 100)) {
    return res.status(400).json({ error: 'Name must be a string up to 100 characters' });
  }

  const coordError = validateCoords(lat, lng, radius);
  if (coordError) {
    return res.status(400).json({ error: coordError });
  }

  try {
    const { rows: existing } = await query('SELECT user_id FROM locations WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    if (existing[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { rows } = await query(
      `UPDATE locations
       SET name = $1, address = $2, latitude = $3, longitude = $4, radius_meters = $5
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [name, address, parseFloat(lat), parseFloat(lng), parseInt(radius), id, req.userId]
    );
    res.json(rows[0]);
  } catch (err) {
    console.error('Update location error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  const { id } = req.params;

  try {
    const { rows: existing } = await query('SELECT user_id FROM locations WHERE id = $1', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    if (existing[0].user_id !== req.userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await query('DELETE FROM locations WHERE id = $1 AND user_id = $2', [id, req.userId]);
    res.status(204).send();
  } catch (err) {
    console.error('Delete location error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
