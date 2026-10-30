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

    // Run 3 lightweight queries in parallel instead of 12+ sequential loop queries
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const eightWeeksAgo = new Date(weekStart);
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 7 * 7);

    const [visitRowsRes, mostVisitedRes, allDatesRes] = await Promise.all([
      query(
        `SELECT TO_CHAR(DATE(visited_at), 'YYYY-MM-DD') as visit_date, COUNT(*)::int as count
         FROM visits
         WHERE user_id = $1 AND visited_at >= $2 AND visited_at <= $3
         GROUP BY DATE(visited_at)`,
        [userId, start, end]
      ),
      query(
        `SELECT l.name, COUNT(*)::int as count
         FROM visits v
         JOIN locations l ON l.id = v.location_id
         WHERE v.user_id = $1
         GROUP BY l.id, l.name
         ORDER BY count DESC
         LIMIT 1`,
        [userId]
      ),
      query(
        `SELECT visited_at FROM visits WHERE user_id = $1 ORDER BY visited_at DESC`,
        [userId]
      ),
    ]);

    const stats = {};
    visitRowsRes.rows.forEach(r => {
      stats[r.visit_date] = r.count;
    });

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    let thisWeekCount = 0;
    let trailing8Total = 0;
    const weeksWithVisits = new Set();

    for (const row of allDatesRes.rows) {
      const t = new Date(row.visited_at);
      if (t >= weekStart) {
        thisWeekCount++;
      }
      if (t >= eightWeeksAgo && t <= weekEnd) {
        trailing8Total++;
      }
      // Compute week bucket index relative to weekStart
      const diffMs = weekStart.getTime() - t.getTime();
      const weekOffset = diffMs <= 0 ? 0 : Math.floor(diffMs / (7 * 86400000)) + 1;
      weeksWithVisits.add(weekOffset);
    }

    let streak = 0;
    let offset = 0;
    if (weeksWithVisits.has(0)) {
      streak++;
      offset = 1;
    } else {
      offset = 1;
    }
    while (weeksWithVisits.has(offset)) {
      streak++;
      offset++;
    }

    const weeklyAvg = (trailing8Total / 8).toFixed(1);

    res.json({
      stats,
      summary: {
        thisWeek: thisWeekCount,
        currentStreak: streak,
        mostVisited: mostVisitedRes.rows.length > 0 ? mostVisitedRes.rows[0].name : '—',
        weeklyAverage: weeklyAvg,
      },
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
