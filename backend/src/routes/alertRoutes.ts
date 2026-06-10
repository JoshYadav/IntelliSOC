import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';

const router = Router();

const VALID_STATUSES = ['NEW', 'ACKNOWLEDGED', 'FALSE_POSITIVE', 'ESCALATED', 'RESOLVED'];

// ── PATCH /api/alerts/:id/status ──────────────────────────────────────────────
/**
 * Update the lifecycle status of a single alert.
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid alert ID' });
    }

    const { status } = req.body;
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const alert = await prisma.alert.update({
      where: { id },
      data: { status },
    });

    return res.json(alert);
  } catch (err: any) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Alert not found' });
    }
    console.error('[Alerts] Status update error:', err);
    return res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/alerts/bulk-status ─────────────────────────────────────────────
/**
 * Update status for multiple alerts at once.
 */
router.patch('/bulk-status', async (req: Request, res: Response) => {
  try {
    const { alertIds, status } = req.body;

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({ error: 'alertIds[] is required' });
    }
    if (!status || !VALID_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
      });
    }

    const result = await prisma.alert.updateMany({
      where: { id: { in: alertIds } },
      data: { status },
    });

    return res.json({ updated: result.count });
  } catch (err: any) {
    console.error('[Alerts] Bulk status update error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export { router as alertRoutes };
