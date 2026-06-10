import { Router, Request, Response } from 'express';
import {
  createIncident,
  listIncidents,
  getIncident,
  updateIncident,
  addNote,
  linkAlerts,
} from '../services/incidentService';
import { generateIncidentSummary } from '../services/aiSummaryService';
import { runPlaybook, approveAction } from '../services/playbookService';

const router = Router();

// ── UUID validation ───────────────────────────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isUUID(s: string): boolean {
  return UUID_REGEX.test(s);
}

// ── POST /api/incidents ───────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, priority, alertIds } = req.body;

    if (!title || !alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({ error: 'title and alertIds[] are required' });
    }

    const incident = await createIncident({ title, description, priority, alertIds });
    return res.status(201).json(incident);
  } catch (err: any) {
    console.error('[Incidents] Create error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/incidents ────────────────────────────────────────────────────────
router.get('/', async (req: Request, res: Response) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    const priority = req.query.priority ? String(req.query.priority) : undefined;

    const incidents = await listIncidents({ status, priority });
    return res.json(incidents);
  } catch (err: any) {
    console.error('[Incidents] List error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/incidents/:id ────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid incident ID' });

    const incident = await getIncident(id);
    if (!incident) return res.status(404).json({ error: 'Incident not found' });

    return res.json(incident);
  } catch (err: any) {
    console.error('[Incidents] Get error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/incidents/:id ──────────────────────────────────────────────────
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid incident ID' });

    const { status, priority, assignee } = req.body;
    const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'FALSE_POSITIVE'];
    const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    if (priority && !VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}` });
    }

    const author = (req as any).user?.username ?? 'analyst';
    const updated = await updateIncident(id, { status, priority, assignee }, author);
    if (!updated) return res.status(404).json({ error: 'Incident not found' });

    return res.json(updated);
  } catch (err: any) {
    console.error('[Incidents] Update error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/incidents/:id/notes ─────────────────────────────────────────────
router.post('/:id/notes', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid incident ID' });

    const { content } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'content (string) is required' });
    }

    const author = (req as any).user?.username ?? 'analyst';
    const event = await addNote(id, content, author);
    return res.status(201).json(event);
  } catch (err: any) {
    console.error('[Incidents] Note error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/incidents/:id/alerts ────────────────────────────────────────────
router.post('/:id/alerts', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid incident ID' });

    const { alertIds } = req.body;
    if (!alertIds || !Array.isArray(alertIds)) {
      return res.status(400).json({ error: 'alertIds[] is required' });
    }

    const result = await linkAlerts(id, alertIds);
    return res.json(result);
  } catch (err: any) {
    console.error('[Incidents] Link alerts error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/incidents/:id/playbooks/:pid/run ────────────────────────────────
router.post('/:id/playbooks/:pid/run', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const pid = String(req.params.pid);
    if (!isUUID(id) || !isUUID(pid)) {
      return res.status(400).json({ error: 'Invalid incident or playbook ID' });
    }

    const runId = await runPlaybook(pid, id);
    return res.json({ runId, message: 'Playbook executed' });
  } catch (err: any) {
    console.error('[Incidents] Playbook run error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/incidents/:id/actions/:runId/approve ────────────────────────────
router.post('/:id/actions/:runId/approve', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const runId = String(req.params.runId);
    const { stepIndex } = req.body;

    if (!isUUID(id) || !isUUID(runId)) {
      return res.status(400).json({ error: 'Invalid incident or run ID' });
    }
    if (stepIndex == null || typeof stepIndex !== 'number') {
      return res.status(400).json({ error: 'stepIndex (number) is required' });
    }

    const approvedBy = (req as any).user?.username ?? 'analyst';
    const result = await approveAction(id, runId, stepIndex, approvedBy);
    return res.json(result);
  } catch (err: any) {
    console.error('[Incidents] Approve action error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/incidents/:id/ai-summary ─────────────────────────────────────────
router.get('/:id/ai-summary', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!isUUID(id)) return res.status(400).json({ error: 'Invalid incident ID' });

    const force = req.query.force === 'true';
    const summary = await generateIncidentSummary(id, force);

    if (!summary) {
      return res.status(503).json({ error: 'AI summary unavailable — check AI_API_KEY' });
    }

    return res.json({ summary });
  } catch (err: any) {
    console.error('[Incidents] AI summary error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export { router as incidentRoutes };
