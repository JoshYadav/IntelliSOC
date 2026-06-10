import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';

const router = Router();

const IGNORED_IPS = new Set(['LOCAL', 'UNKNOWN', '127.0.0.1', '0.0.0.0', '::', '::1']);

// ── GET /api/correlations ────────────────────────────────────────────────────
// Find IPs seen across multiple upload sessions
router.get('/', async (_req: Request, res: Response) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: {
        ip: {
          notIn: Array.from(IGNORED_IPS),
        },
      },
      include: {
        session: {
          select: {
            fileName: true,
          },
        },
      },
    });

    // Group alerts by IP address
    const ipGroups = new Map<string, {
      ip: string;
      alertCount: number;
      sessions: Set<string>;
      sessionNames: Set<string>;
      maxRiskScore: number;
      severities: Record<string, number>;
      lastSeen: Date;
    }>();

    for (const alert of alerts) {
      if (!alert.ip) continue;
      const ip = alert.ip;

      const group = ipGroups.get(ip) || {
        ip,
        alertCount: 0,
        sessions: new Set<string>(),
        sessionNames: new Set<string>(),
        maxRiskScore: 0,
        severities: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 },
        lastSeen: new Date(0),
      };

      group.alertCount += alert.count;
      group.sessions.add(alert.sessionId);
      if (alert.session?.fileName) {
        group.sessionNames.add(alert.session.fileName);
      }
      group.maxRiskScore = Math.max(group.maxRiskScore, alert.riskScore);
      
      const sev = alert.severity.toUpperCase();
      if (sev in group.severities) {
        group.severities[sev] += alert.count;
      }

      const alertTime = new Date(alert.timestamp);
      if (alertTime > group.lastSeen) {
        group.lastSeen = alertTime;
      }

      ipGroups.set(ip, group);
    }

    // Convert groups to list and filter for multi-session correlation
    const correlations = Array.from(ipGroups.values())
      .map(g => ({
        ip: g.ip,
        alertCount: g.alertCount,
        sessionCount: g.sessions.size,
        sessionNames: Array.from(g.sessionNames),
        maxRiskScore: g.maxRiskScore,
        severities: g.severities,
        lastSeen: g.lastSeen,
      }))
      // Sort by session count descending, then by risk score descending
      .sort((a, b) => b.sessionCount - a.sessionCount || b.maxRiskScore - a.maxRiskScore);

    return res.json(correlations);
  } catch (err: any) {
    console.error('[Correlations] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

export { router as correlationRoutes };
