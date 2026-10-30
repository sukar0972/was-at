import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import locationRoutes from './routes/locations.js';
import visitRoutes from './routes/visits.js';
import statsRoutes from './routes/stats.js';
import tokenRoutes from './routes/tokens.js';
import profileRoutes from './routes/profile.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(express.json({ limit: '10kb' }));

// Security and no-cache headers for API routes
app.use('/api', (_req, res, next) => {
  res.set({
    'Cache-Control': 'no-store, max-age=0',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
  });
  next();
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/users', adminRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/visits/stats', statsRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/profile', profileRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve static frontend and bind port only outside Vercel
if (!process.env.VERCEL) {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Visit Tracker server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
