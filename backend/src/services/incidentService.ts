import prisma from '../utils/prisma';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CreateIncidentInput {
  title: string;
  description?: string;
  priority?: string;
  alertIds: number[];
}

export interface UpdateIncidentInput {
  status?: string;
  priority?: string;
  assignee?: string | null;
  aiSummary?: string;
}

// ── Incident CRUD ─────────────────────────────────────────────────────────────

/**
 * Create an incident and link the provided alert IDs.
 * Also adds a timeline event for the creation and for each linked alert.
 */
export async function createIncident(input: CreateIncidentInput) {
  const incident = await prisma.incident.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      priority: input.priority ?? 'MEDIUM',
      alerts: {
        create: input.alertIds.map((alertId) => ({ alertId })),
      },
      timeline: {
        create: [
          {
            type: 'STATUS_CHANGE',
            content: `Incident created with priority ${input.priority ?? 'MEDIUM'}`,
            author: 'system',
          },
          ...input.alertIds.map((alertId) => ({
            type: 'ALERT_ADDED' as const,
            content: `Alert #${alertId} linked to incident`,
            author: 'system',
          })),
        ],
      },
    },
    include: {
      alerts: { include: { alert: true } },
      timeline: { orderBy: { createdAt: 'asc' as const } },
      playbookRuns: true,
    },
  });

  // Mark linked alerts as ESCALATED
  if (input.alertIds.length > 0) {
    await prisma.alert.updateMany({
      where: { id: { in: input.alertIds } },
      data: { status: 'ESCALATED' },
    });
  }

  return incident;
}

/**
 * List all incidents with alert counts, ordered by most recent first.
 */
export async function listIncidents(filters?: {
  status?: string;
  priority?: string;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.status) where.status = filters.status;
  if (filters?.priority) where.priority = filters.priority;

  return prisma.incident.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      alerts: { include: { alert: true } },
      _count: { select: { alerts: true, timeline: true, playbookRuns: true } },
    },
  });
}

/**
 * Get a single incident with all related data.
 */
export async function getIncident(id: string) {
  return prisma.incident.findUnique({
    where: { id },
    include: {
      alerts: {
        include: {
          alert: true,
        },
      },
      timeline: { orderBy: { createdAt: 'asc' } },
      playbookRuns: {
        include: { playbook: true },
        orderBy: { startedAt: 'desc' },
      },
    },
  });
}

/**
 * Update incident fields (status, priority, assignee, aiSummary).
 * Logs a timeline event for each change.
 */
export async function updateIncident(id: string, input: UpdateIncidentInput, author = 'system') {
  const current = await prisma.incident.findUnique({ where: { id } });
  if (!current) return null;

  const timelineEvents: { type: string; content: string; author: string }[] = [];

  if (input.status && input.status !== current.status) {
    timelineEvents.push({
      type: 'STATUS_CHANGE',
      content: `Status changed: ${current.status} → ${input.status}`,
      author,
    });
  }

  if (input.priority && input.priority !== current.priority) {
    timelineEvents.push({
      type: 'STATUS_CHANGE',
      content: `Priority changed: ${current.priority} → ${input.priority}`,
      author,
    });
  }

  if (input.assignee !== undefined && input.assignee !== current.assignee) {
    timelineEvents.push({
      type: 'STATUS_CHANGE',
      content: input.assignee
        ? `Assigned to ${input.assignee}`
        : 'Unassigned',
      author,
    });
  }

  if (input.aiSummary && input.aiSummary !== current.aiSummary) {
    timelineEvents.push({
      type: 'NOTE',
      content: 'AI summary generated',
      author: 'system',
    });
  }

  return prisma.incident.update({
    where: { id },
    data: {
      ...(input.status && { status: input.status }),
      ...(input.priority && { priority: input.priority }),
      ...(input.assignee !== undefined && { assignee: input.assignee }),
      ...(input.aiSummary && { aiSummary: input.aiSummary }),
      timeline: {
        create: timelineEvents,
      },
    },
    include: {
      alerts: { include: { alert: true } },
      timeline: { orderBy: { createdAt: 'asc' } },
      playbookRuns: true,
    },
  });
}

/**
 * Add a text note to an incident's timeline.
 */
export async function addNote(incidentId: string, content: string, author = 'analyst') {
  return prisma.incidentEvent.create({
    data: {
      incidentId,
      type: 'NOTE',
      content,
      author,
    },
  });
}

/**
 * Link additional alerts to an existing incident.
 */
export async function linkAlerts(incidentId: string, alertIds: number[]) {
  // Filter out already-linked alerts
  const existing = await prisma.incidentAlert.findMany({
    where: { incidentId, alertId: { in: alertIds } },
  });
  const existingIds = new Set(existing.map((e) => e.alertId));
  const newIds = alertIds.filter((id) => !existingIds.has(id));

  if (newIds.length === 0) return { linked: 0 };

  await prisma.incidentAlert.createMany({
    data: newIds.map((alertId) => ({ incidentId, alertId })),
  });

  await prisma.incidentEvent.createMany({
    data: newIds.map((alertId) => ({
      incidentId,
      type: 'ALERT_ADDED',
      content: `Alert #${alertId} linked to incident`,
      author: 'system',
    })),
  });

  // Mark newly-linked alerts as ESCALATED
  await prisma.alert.updateMany({
    where: { id: { in: newIds } },
    data: { status: 'ESCALATED' },
  });

  return { linked: newIds.length };
}

function formatAlertType(type: string): string {
  return type
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Auto-grouping logic ───────────────────────────────────────────────────────
/**
 * After alerts are stored, auto-create or update incidents by grouping alerts
 * from the same source IP within the same session.
 *
 * Returns the list of incident IDs that were created or updated.
 */
export async function autoGroupAlerts(sessionId: string): Promise<string[]> {
  // Fetch all NEW alerts for this session
  const alerts = await prisma.alert.findMany({
    where: { sessionId, status: 'NEW' },
    orderBy: { timestamp: 'asc' },
  });

  if (alerts.length === 0) return [];

  // Group by source IP
  const ipGroups = new Map<string, typeof alerts>();
  for (const alert of alerts) {
    const group = ipGroups.get(alert.ip) || [];
    group.push(alert);
    ipGroups.set(alert.ip, group);
  }

  const incidentIds: string[] = [];

  for (const [ip, groupAlerts] of ipGroups) {
    // Determine highest severity in the group
    const severityOrder = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const highestSeverity = groupAlerts.reduce((max, a) => {
      return severityOrder.indexOf(a.severity) > severityOrder.indexOf(max)
        ? a.severity
        : max;
    }, 'LOW');

    // Map severity to priority
    const priorityMap: Record<string, string> = {
      LOW: 'LOW',
      MEDIUM: 'MEDIUM',
      HIGH: 'HIGH',
      CRITICAL: 'CRITICAL',
    };

    const alertTypes = [...new Set(groupAlerts.map((a) => a.type))];
    const isMultiVector = alertTypes.length > 1;
    const cleanTitle = isMultiVector ? 'Multi-vector attack' : `${formatAlertType(alertTypes[0])} attack`;
    const title = `${cleanTitle} from ${ip}::${alertTypes.join(', ')}`;
    const description = `Auto-generated incident for ${groupAlerts.length} alert(s) from IP ${ip} in session ${sessionId}. Alert types: ${alertTypes.join(', ')}.`;

    const incident = await createIncident({
      title,
      description,
      priority: priorityMap[highestSeverity] ?? 'MEDIUM',
      alertIds: groupAlerts.map((a) => a.id),
    });

    // Link session to the first incident created
    if (incidentIds.length === 0) {
      await prisma.session.update({
        where: { id: sessionId },
        data: { incidentId: incident.id },
      });
    }

    incidentIds.push(incident.id);
  }

  console.log(`[SOAR] Auto-grouped ${alerts.length} alerts into ${incidentIds.length} incident(s)`);
  return incidentIds;
}
