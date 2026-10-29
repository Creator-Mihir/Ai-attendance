import express from 'express';
import cors from 'cors';
import { apiRouter } from './routes';
import { backendDb } from './db';
import fs from 'node:fs';
import path from 'node:path';

function loadLocalEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (!match || match[1].startsWith('#') || process.env[match[1]] !== undefined) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

loadLocalEnv();

if (process.env.NODE_ENV === 'production') {
  if (!process.env.AUTH_TOKEN_SECRET || process.env.AUTH_TOKEN_SECRET.trim().length < 32) throw new Error('Production requires AUTH_TOKEN_SECRET with at least 32 characters.');
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 12) throw new Error('Production requires ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters.');
  if (!process.env.CORS_ALLOWED_ORIGINS?.trim()) throw new Error('Production requires CORS_ALLOWED_ORIGINS for the deployed admin website.');
}

export const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Private-Network', 'true');
  next();
});
app.use(cors({
  origin(origin, callback) {
    const normalized = (origin || '').replace(/\/$/, '');
    if (!origin || process.env.NODE_ENV !== 'production' || allowedOrigins.includes(normalized)) return callback(null, true);
    return callback(new Error('This browser origin is not allowed by the API CORS policy.'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Mount API router
app.use('/api', apiRouter);

// Root greeting
app.get('/', (_req, res) => {
  res.json({
    name: 'AI Teacher Attendance Backend API Server',
    version: '1.0.0',
    phase: 'Phase 6 — Backend & Database Complete',
    endpoints: {
      register: 'POST /api/auth/register',
      login: 'POST /api/auth/login',
      otpSend: 'POST /api/auth/otp/send',
      otpVerify: 'POST /api/auth/otp/verify',
      profile: 'GET /api/teacher/profile',
      faceRegister: 'POST /api/teacher/face/register',
      attendancePunch: 'POST /api/attendance/punch',
      syncBatch: 'POST /api/sync/batch',
      adminLogin: 'POST /api/admin/auth/login',
      adminAttendance: 'GET /api/admin/attendance',
      health: 'GET /api/health',
    },
  });
});

// Serve static React Admin Web app if built
const ADMIN_DIST = path.resolve(__dirname, '../admin-web/dist');
if (fs.existsSync(ADMIN_DIST)) {
  app.use('/admin', express.static(ADMIN_DIST));
  app.get(/^\/admin(\/.*)?$/, (_req, res) => {
    res.sendFile(path.join(ADMIN_DIST, 'index.html'));
  });
}

if (require.main === module) {
  backendDb.init().then(() => {
    app.listen(Number(PORT), '0.0.0.0', () => {
      console.log(`🚀 [Server] Running on http://0.0.0.0:${PORT}`);
      console.log(`💻 [Multi-Tier Admin Web] Running on http://localhost:${PORT}/admin`);
      console.log(`📡 Local Network Access: http://10.160.91.199:${PORT}/api`);
      if (process.env.TURSO_DATABASE_URL) {
        console.log(`🌐 [Database] Connected to online Turso Cloud database: ${process.env.TURSO_DATABASE_URL}`);
      } else {
        console.log(`📡 [Database] Loaded local SQLite file at server/data/backend.db`);
      }
    });
  }).catch((err) => {
    console.error('❌ Failed to initialize database:', err);
    process.exit(1);
  });
}
