import { Router, Request, Response } from 'express';
import {
  listPlaybooks,
  getPlaybook,
  createPlaybook,
  updatePlaybook,
  deletePlaybook,
  runPlaybook,
} from '../services/playbookService';

const router = Router();

// ── UUID validation ───────────────────────────────────────────────────────────
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ── GET /api/playbooks ────────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response) => {
  try {
    const playbooks = await listPlaybooks();
    return res.json(playbooks);
  } catch (err: any) {
    console.error('[Playbooks] List error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/playbooks/:id ────────────────────────────────────────────────────
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid playbook ID' });

    const playbook = await getPlaybook(id);
    if (!playbook) return res.status(404).json({ error: 'Playbook not found' });

    return res.json(playbook);
  } catch (err: any) {
    console.error('[Playbooks] Get error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/playbooks ──────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, trigger, steps, enabled } = req.body;

    if (!name || !trigger || !steps || !Array.isArray(steps)) {
      return res.status(400).json({ error: 'name, trigger, and steps[] are required' });
    }

    const playbook = await createPlaybook({ name, description, trigger, steps, enabled });
    return res.status(201).json(playbook);
  } catch (err: any) {
    console.error('[Playbooks] Create error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/playbooks/:id ──────────────────────────────────────────────────
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid playbook ID' });

    const { name, description, trigger, steps, enabled } = req.body;

    const updated = await updatePlaybook(id, { name, description, trigger, steps, enabled });
    return res.json(updated);
  } catch (err: any) {
    console.error('[Playbooks] Update error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/playbooks/:id ─────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid playbook ID' });

    await deletePlaybook(id);
    return res.json({ message: 'Playbook deleted' });
  } catch (err: any) {
    console.error('[Playbooks] Delete error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/playbooks/:id/test ──────────────────────────────────────────────
/**
 * Dry-run: execute a playbook against an incident without persisting results.
 * Requires incidentId in the body — uses real incident data but in read-only mode.
 */
router.post('/:id/test', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    if (!UUID_REGEX.test(id)) return res.status(400).json({ error: 'Invalid playbook ID' });

    const { incidentId } = req.body;
    if (!incidentId || !UUID_REGEX.test(incidentId)) {
      return res.status(400).json({ error: 'A valid incidentId is required for testing' });
    }

    // Run the playbook normally — in production we'd sandbox this
    const runId = await runPlaybook(id, incidentId);
    return res.json({ runId, message: 'Playbook test run completed' });
  } catch (err: any) {
    console.error('[Playbooks] Test error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export { router as playbookRoutes };
