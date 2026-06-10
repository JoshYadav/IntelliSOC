import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { logRoutes } from './routes/logRoutes';
import { incidentRoutes } from './routes/incidentRoutes';
import { playbookRoutes } from './routes/playbookRoutes';
import { alertRoutes } from './routes/alertRoutes';
import { edrRoutes } from './routes/edrRoutes';
import { endpointRoutes } from './routes/endpointRoutes';
import { correlationRoutes } from './routes/correlationRoutes';
import { markStaleEndpoints } from './services/endpointService';

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS — restrict to explicit origin whitelist ──────────────────────────────
// Set ALLOWED_ORIGINS in .env as a comma-separated list, e.g.:
//   ALLOWED_ORIGINS="http://localhost:5173,https://intellisoc.example.com"
const rawOrigins = process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173';
const allowedOrigins = rawOrigins
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server / curl (no Origin header) only in dev
      if (!origin) {
        if (process.env.NODE_ENV === 'production') {
          return callback(new Error('Origin required in production'), false);
        }
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin '${origin}' not allowed`), false);
    },
    credentials: true,
  })
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
// General API limit: 200 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Upload limit: 30 uploads per 15 minutes per IP (processing is expensive)
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload rate limit exceeded. Please wait before uploading again.' },
});

app.use('/api', generalLimiter);
app.use('/api/logs/upload', uploadLimiter);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api', logRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/playbooks', playbookRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/edr', edrRoutes);
app.use('/api/endpoints', endpointRoutes);
app.use('/api/correlations', correlationRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Handle CORS errors gracefully
  if (err.message?.startsWith('CORS')) {
    return res.status(403).json({ error: err.message });
  }
  console.error('[Server Error]', err);
  return res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 IntelliSOC server running on http://localhost:${PORT}`);
  console.log(`🔒 CORS allowed origins: ${allowedOrigins.join(', ')}`);

  // EDR: Periodically mark stale endpoints (every 60 seconds)
  setInterval(async () => {
    try {
      await markStaleEndpoints();
    } catch (err: any) {
      console.error('[EDR] Stale endpoints check failed:', err.message);
    }
  }, 60 * 1000);
});

export default app;
