import { Router, Request, Response } from 'express';
import { upsertEndpoint, storeTelemetry, heartbeat } from '../services/endpointService';
import { runEdrDetection } from '../services/edrDetectionService';

const router = Router();

// ── POST /api/edr/telemetry ──────────────────────────────────────────────────
// Agent ships: { hostname, ip?, os?, agentVersion?, type, data[] }
router.post('/telemetry', async (req: Request, res: Response) => {
  try {
    const { hostname, ip, os, agentVersion, type, data } = req.body;

    if (!hostname || !type || !data || !Array.isArray(data)) {
      return res.status(400).json({
        error: 'hostname, type (PROCESS|NETWORK|FILE), and data[] are required',
      });
    }

    const validTypes = ['PROCESS', 'NETWORK', 'FILE', 'SYSTEM_INFO'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Invalid telemetry type. Must be one of: ${validTypes.join(', ')}`,
      });
    }

    // 1. Register / update endpoint
    const endpoint = await upsertEndpoint(hostname, ip, os, agentVersion);

    // 2. Store telemetry
    await storeTelemetry(endpoint.id, type, data);

    // 3. Run detection engine on incoming data
    const alerts = await runEdrDetection(hostname, type, data);

    console.log(
      `[EDR] 📡 Telemetry received: ${hostname} | type=${type} | entries=${data.length} | alerts=${alerts.length}`
    );

    return res.json({
      message: 'Telemetry ingested',
      endpointId: endpoint.id,
      entriesStored: data.length,
      alertsGenerated: alerts.length,
    });
  } catch (err: any) {
    console.error('[EDR] Telemetry ingestion error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/edr/heartbeat ──────────────────────────────────────────────────
// Agent sends: { hostname }
router.post('/heartbeat', async (req: Request, res: Response) => {
  try {
    const { hostname } = req.body;

    if (!hostname) {
      return res.status(400).json({ error: 'hostname is required' });
    }

    const endpoint = await heartbeat(hostname);
    if (!endpoint) {
      return res.status(404).json({ error: `Endpoint "${hostname}" not registered. Send telemetry first.` });
    }

    return res.json({
      message: 'Heartbeat acknowledged',
      status: endpoint.status,
      lastSeen: endpoint.lastSeen,
    });
  } catch (err: any) {
    console.error('[EDR] Heartbeat error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export { router as edrRoutes };
