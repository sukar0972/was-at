import { Router } from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const { viewMode, year, month } = req.query;
  const userId = req.userId;

  try {
    const now = new Date();
    const currentYear = year ? parseInt(year) : now.getFullYear();
    const currentMonth = month !== undefined ? parseInt(month) : now.getMonth();

    let start, end;

    if (viewMode === 'year') {
      start = new Date(currentYear, 0, 1);
      end = new Date(currentYear, 11, 31, 23, 59, 59);
    } else if (viewMode === 'month') {
      start = new Date(currentYear, currentMonth, 1);
      end = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
    } else {
      // week - use current week
      const d = new Date();
      const day = d.getDay();
      start = new Date(d);
      start.setDate(d.getDate() - day);
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    }

    // Daily stats for the view
    const { rows: visitRows } = await query(
      `SELECT DATE(visited_at) as visit_date, COUNT(*) as count
       FROM visits
       WHERE user_id = $1 AND visited_at >= $2 AND visited_at <= $3
       GROUP BY DATE(visited_at)`,
      [userId, start, end]
    );

    const stats = {};
    visitRows.forEach(r => {
      stats[r.visit_date.toISOString().split('T')[0]] = parseInt(r.count);
    });

    // This week count
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const { rows: thisWeekRow } = await query(
      'SELECT COUNT(*) as count FROM visits WHERE user_id = $1 AND visited_at >= $2',
      [userId, weekStart]
    );

    // Current streak (consecutive weeks with at least one visit)
    let streak = 0;
    const checkWeek = new Date(now);
    checkWeek.setDate(checkWeek.getDate() - checkWeek.getDay());
    while (true) {
      const ws = new Date(checkWeek);
      const we = new Date(checkWeek);
      we.setDate(ws.getDate() + 6);
      we.setHours(23, 59, 59, 999);
      const { rows } = await query(
        'SELECT 1 FROM visits WHERE user_id = $1 AND visited_at >= $2 AND visited_at <= $3 LIMIT 1',
        [userId, ws, we]
      );
      if (rows.length === 0 && checkWeek < weekStart) break;
      if (rows.length > 0) streak++;
      checkWeek.setDate(checkWeek.getDate() - 7);
    }

    // Most visited location
    const { rows: mostVisitedRow } = await query(
      `SELECT l.name, COUNT(*) as count
       FROM visits v
       JOIN locations l ON l.id = v.location_id
       WHERE v.user_id = $1
       GROUP BY l.id, l.name
       ORDER BY count DESC
       LIMIT 1`,
      [userId]
    );

    // Weekly average over trailing 8 weeks
    const trailing8 = [];
    for (let i = 0; i < 8; i++) {
      const ws = new Date(now);
      ws.setDate(ws.getDate() - ws.getDay() - i * 7);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      we.setHours(23, 59, 59, 999);
      const { rows } = await query(
        'SELECT COUNT(*) as count FROM visits WHERE user_id = $1 AND visited_at >= $2 AND visited_at <= $3',
        [userId, ws, we]
      );
      trailing8.push(parseInt(rows[0].count));
    }
    const weeklyAvg = (trailing8.reduce((a, b) => a + b, 0) / trailing8.length).toFixed(1);

    res.json({
      stats,
      summary: {
        thisWeek: parseInt(thisWeekRow[0].count),
        currentStreak: streak,
        mostVisited: mostVisitedRow.length > 0 ? mostVisitedRow[0].name : '—',
        weeklyAverage: weeklyAvg,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
