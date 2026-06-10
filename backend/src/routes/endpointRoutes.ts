import { Router, Request, Response } from 'express';
import {
  listEndpoints,
  getEndpoint,
  isolateEndpoint,
  unisolateEndpoint,
  getLatestTelemetry,
  getEndpointAlerts,
} from '../services/endpointService';

const router = Router();

// ── GET /api/endpoints ───────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const endpoints = await listEndpoints();
    return res.json(endpoints);
  } catch (err: any) {
    console.error('[Endpoints] List error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/endpoints/:id ───────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const endpoint = await getEndpoint(req.params.id as string);
    if (!endpoint) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    return res.json(endpoint);
  } catch (err: any) {
    console.error('[Endpoints] Get error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/endpoints/:id/isolate ──────────────────────────────────────────
router.post('/:id/isolate', async (req: Request, res: Response) => {
  try {
    const endpoint = await isolateEndpoint(req.params.id as string);
    console.log(`[EDR] 🔒 Endpoint isolated: ${endpoint.hostname}`);
    return res.json({ message: `Endpoint "${endpoint.hostname}" isolated`, endpoint });
  } catch (err: any) {
    console.error('[Endpoints] Isolate error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/endpoints/:id/unisolate ────────────────────────────────────────
router.post('/:id/unisolate', async (req: Request, res: Response) => {
  try {
    const endpoint = await unisolateEndpoint(req.params.id as string);
    console.log(`[EDR] 🔓 Endpoint unisolated: ${endpoint.hostname}`);
    return res.json({ message: `Endpoint "${endpoint.hostname}" unisolated`, endpoint });
  } catch (err: any) {
    console.error('[Endpoints] Unisolate error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/endpoints/:id/processes ─────────────────────────────────────────
router.get('/:id/processes', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const telemetry = await getLatestTelemetry(req.params.id as string, 'PROCESS', limit);
    // Parse JSON data field for each entry
    const parsed = telemetry.map((t) => ({
      ...t,
      data: JSON.parse(t.data),
    }));
    return res.json(parsed);
  } catch (err: any) {
    console.error('[Endpoints] Processes error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/endpoints/:id/network ───────────────────────────────────────────
router.get('/:id/network', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const telemetry = await getLatestTelemetry(req.params.id as string, 'NETWORK', limit);
    const parsed = telemetry.map((t) => ({
      ...t,
      data: JSON.parse(t.data),
    }));
    return res.json(parsed);
  } catch (err: any) {
    console.error('[Endpoints] Network error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/endpoints/:id/files ─────────────────────────────────────────────
router.get('/:id/files', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const telemetry = await getLatestTelemetry(req.params.id as string, 'FILE', limit);
    const parsed = telemetry.map((t) => ({
      ...t,
      data: JSON.parse(t.data),
    }));
    return res.json(parsed);
  } catch (err: any) {
    console.error('[Endpoints] Files error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/endpoints/:id/alerts ────────────────────────────────────────────
router.get('/:id/alerts', async (req: Request, res: Response) => {
  try {
    const alerts = await getEndpointAlerts(req.params.id as string);
    return res.json(alerts);
  } catch (err: any) {
    console.error('[Endpoints] Alerts error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export { router as endpointRoutes };
