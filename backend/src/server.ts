import express from 'express';

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

app.use((req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
  const origin = req.headers.origin as string | undefined;
  
  if (!origin || origin.endsWith('.vercel.app') || origin.startsWith('http://localhost')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  next();
});

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
  console.log(`🔒 CORS allowed origins: ${process.env.ALLOWED_ORIGINS || '*'}`);

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
