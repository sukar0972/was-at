import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const dbSecretSeed =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.STORAGE_URL;

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (dbSecretSeed
    ? crypto.createHash('sha256').update(`vt-jwt:${dbSecretSeed}`).digest('hex')
    : null);

if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET (or DATABASE_URL/POSTGRES_URL) environment variable is required');
  if (!process.env.VERCEL) process.exit(1);
}

// Dummy bcrypt hash for timing-attack mitigation on username enumeration
export const DUMMY_HASH = '$2a$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgOzt0rt7zu';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d', algorithm: 'HS256' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return null;
  }
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.userId = decoded.sub;
  req.user = decoded;
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.user?.is_admin) {
    return res.status(403).json({ error: 'Forbidden: admin required' });
  }
  next();
}
