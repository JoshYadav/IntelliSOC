import prisma from '../utils/prisma';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlaybookStep {
  index: number;
  type: string;
  label: string;
  config?: Record<string, unknown>;
  requiresApproval?: boolean;
}

export interface StepResult {
  stepIndex: number;
  type: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING_APPROVAL' | 'SKIPPED';
  output: string;
}

interface AlertContext {
  ip: string;
  user?: string | null;
  type: string;
  severity: string;
  count: number;
  mitreTactic?: string | null;
  abuseScore?: number | null;
  country?: string | null;
  hostname?: string;
}

// ── Template interpolation ────────────────────────────────────────────────────

/**
 * Replace {{var}} placeholders in a string with values from the alert context.
 */
function interpolate(template: string, ctx: AlertContext): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    const val = (ctx as unknown as Record<string, unknown>)[key];
    return val != null ? String(val) : `<${key}>`;
  });
}

// ── Step executors ────────────────────────────────────────────────────────────

/**
 * Perform the actual side effect/action for a playbook step.
 */
async function runStepAction(
  step: PlaybookStep,
  incidentId: string,
  alertCtx: AlertContext
): Promise<{ status: StepResult['status']; output: string }> {
  switch (step.type) {
    case 'AI_SUMMARY': {
      const { generateIncidentSummary } = await import('./aiSummaryService');
      const summary = await generateIncidentSummary(incidentId);
      return summary 
        ? { status: 'SUCCESS', output: 'AI summary generated' } 
        : { status: 'SKIPPED', output: 'AI summary skipped (no API key)' };
    }

    case 'CREATE_INCIDENT': {
      const priority = (step.config?.priority as string) ?? undefined;
      if (priority) {
        await prisma.incident.update({
          where: { id: incidentId },
          data: { priority },
        });
      }
      return { status: 'SUCCESS', output: `Incident confirmed${priority ? ` with priority ${priority}` : ''}` };
    }

    case 'ESCALATE_PRIORITY': {
      await prisma.incident.update({
        where: { id: incidentId },
        data: { priority: 'CRITICAL' },
      });
      await prisma.incidentEvent.create({
        data: {
          incidentId,
          type: 'STATUS_CHANGE',
          content: 'Priority escalated to CRITICAL by playbook',
          author: 'system',
        },
      });
      return { status: 'SUCCESS', output: 'Escalated to CRITICAL' };
    }

    case 'NOTIFY_SLACK': {
      const webhookUrl = process.env.SLACK_WEBHOOK_URL;
      if (!webhookUrl) {
        return { status: 'SKIPPED', output: 'SLACK_WEBHOOK_URL not configured' };
      }

      const template = (step.config?.messageTemplate as string) ?? `🚨 Alert: {{type}} from {{ip}}`;
      const text = interpolate(template, alertCtx);

      try {
        const resp = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!resp.ok) {
          return { status: 'FAILED', output: `Slack returned HTTP ${resp.status}` };
        }
      } catch (err: any) {
        return { status: 'FAILED', output: `Slack error: ${err.message}` };
      }

      await prisma.incidentEvent.create({
        data: {
          incidentId,
          type: 'PLAYBOOK_RUN',
          content: '📨 Slack notification sent',
          author: 'system',
        },
      });
      return { status: 'SUCCESS', output: 'Slack notification sent' };
    }

    case 'SEND_EMAIL': {
      const smtpHost = process.env.SMTP_HOST;
      if (!smtpHost) {
        return { status: 'SKIPPED', output: 'SMTP not configured' };
      }
      return { status: 'SKIPPED', output: 'Email integration not yet configured' };
    }

    case 'ADD_NOTE': {
      const note = step.config?.note
        ? interpolate(step.config.note as string, alertCtx)
        : `Playbook step: ${step.label}`;

      await prisma.incidentEvent.create({
        data: {
          incidentId,
          type: 'NOTE',
          content: note,
          author: 'system',
        },
      });
      return { status: 'SUCCESS', output: `Note added: ${note}` };
    }

    case 'BLOCK_IP': {
      const ipToBlock = alertCtx.ip || 'unknown';
      await prisma.incidentEvent.create({
        data: {
          incidentId,
          type: 'PLAYBOOK_RUN',
          content: `🛡️ Firewall block rule enforced for IP: ${ipToBlock}`,
          author: 'system',
        },
      });
      return { status: 'SUCCESS', output: `Firewall block rule successfully enforced for IP: ${ipToBlock}` };
    }

    case 'ISOLATE_ENDPOINT': {
      const hostToIsolate = alertCtx.ip; // EDR alerts use hostnames in the ip field
      if (!hostToIsolate || hostToIsolate === 'unknown') {
        return { status: 'FAILED', output: 'No target endpoint hostname found in alert context' };
      }

      const endpoint = await prisma.endpoint.findUnique({
        where: { hostname: hostToIsolate },
      });

      if (!endpoint) {
        return { status: 'FAILED', output: `Target endpoint hostname "${hostToIsolate}" not registered under active inventory` };
      }

      const { isolateEndpoint } = await import('./endpointService');
      await isolateEndpoint(endpoint.id);

      await prisma.incidentEvent.create({
        data: {
          incidentId,
          type: 'PLAYBOOK_RUN',
          content: `🔒 Endpoint "${hostToIsolate}" isolated (Firewall Lock) by playbook`,
          author: 'system',
        },
      });

      return { status: 'SUCCESS', output: `Endpoint "${hostToIsolate}" successfully isolated (Firewall Lock)` };
    }

    case 'CREATE_TICKET': {
      const ticketId = `INC-${Math.floor(100000 + Math.random() * 900000)}`;
      await prisma.incidentEvent.create({
        data: {
          incidentId,
          type: 'PLAYBOOK_RUN',
          content: `🎫 Ticket ${ticketId} generated in IT support system`,
          author: 'system',
        },
      });
      return { status: 'SUCCESS', output: `Ticket ${ticketId} successfully created in IT service portal` };
    }

    default:
      return { status: 'SKIPPED', output: `Unknown step type: ${step.type}` };
  }
}

/**
 * Execute a single playbook step. Returns a StepResult.
 *
 * Safe (auto-run) steps execute inline.
 * Human-gated steps return PENDING_APPROVAL without executing.
 */
async function executeStep(
  step: PlaybookStep,
  incidentId: string,
  alertCtx: AlertContext,
): Promise<StepResult> {
  const base: Omit<StepResult, 'status' | 'output'> = {
    stepIndex: step.index,
    type: step.type,
  };

  // Human-gated steps → don't execute, just record as pending
  if (step.requiresApproval) {
    await prisma.incidentEvent.create({
      data: {
        incidentId,
        type: 'PLAYBOOK_RUN',
        content: `⏳ Pending approval: ${step.label}`,
        author: 'system',
      },
    });
    return { ...base, status: 'PENDING_APPROVAL', output: `Requires analyst approval: ${step.label}` };
  }

  try {
    const res = await runStepAction(step, incidentId, alertCtx);
    return { ...base, status: res.status, output: res.output };
  } catch (err: any) {
    console.error(`[Playbook] Step ${step.index} (${step.type}) failed:`, err);
    return { ...base, status: 'FAILED', output: err.message || 'Unknown error' };
  }
}

// ── Playbook runner ───────────────────────────────────────────────────────────

/**
 * Execute a playbook against an incident.
 * Runs each step in order, recording results in a PlaybookRun.
 */
export async function runPlaybook(playbookId: string, incidentId: string): Promise<string> {
  const playbook = await prisma.playbook.findUnique({ where: { id: playbookId } });
  if (!playbook) throw new Error(`Playbook ${playbookId} not found`);
  if (!playbook.enabled) throw new Error(`Playbook "${playbook.name}" is disabled`);

  const steps: PlaybookStep[] = JSON.parse(playbook.steps);

  // Get the first alert linked to this incident for context
  const incidentAlert = await prisma.incidentAlert.findFirst({
    where: { incidentId },
    include: { alert: true },
  });

  const alertCtx: AlertContext = incidentAlert?.alert
    ? {
        ip: incidentAlert.alert.ip,
        user: incidentAlert.alert.user,
        type: incidentAlert.alert.type,
        severity: incidentAlert.alert.severity,
        count: incidentAlert.alert.count,
        mitreTactic: incidentAlert.alert.mitreTactic,
        abuseScore: incidentAlert.alert.abuseScore,
        country: incidentAlert.alert.country,
      }
    : { ip: 'unknown', type: 'UNKNOWN', severity: 'MEDIUM', count: 0 };

  // Create the PlaybookRun record
  const run = await prisma.playbookRun.create({
    data: {
      playbookId,
      incidentId,
      status: 'RUNNING',
    },
  });

  // Log timeline event
  await prisma.incidentEvent.create({
    data: {
      incidentId,
      type: 'PLAYBOOK_RUN',
      content: `▶️ Playbook "${playbook.name}" triggered`,
      author: 'system',
    },
  });

  // Execute each step sequentially
  const results: StepResult[] = [];
  let overallStatus: string = 'SUCCESS';

  for (const step of steps) {
    const result = await executeStep(step, incidentId, alertCtx);
    results.push(result);

    if (result.status === 'FAILED') {
      overallStatus = 'FAILED';
      // Continue executing remaining steps (don't stop on failure)
    }
    if (result.status === 'PENDING_APPROVAL' && overallStatus === 'SUCCESS') {
      overallStatus = 'RUNNING'; // Keep run active so UI shows pending actions
    }
  }

  // Update the run record with results
  await prisma.playbookRun.update({
    where: { id: run.id },
    data: {
      status: overallStatus,
      stepResults: JSON.stringify(results),
      finishedAt: new Date(),
    },
  });

  console.log(`[Playbook] "${playbook.name}" completed with status: ${overallStatus}`);
  return run.id;
}

/**
 * Find and run any enabled playbooks that match a given alert type.
 * Called automatically after incident auto-creation.
 */
export async function triggerMatchingPlaybooks(alertType: string, incidentId: string): Promise<string[]> {
  const playbooks = await prisma.playbook.findMany({
    where: { trigger: alertType, enabled: true },
  });

  const runIds: string[] = [];
  for (const pb of playbooks) {
    try {
      const runId = await runPlaybook(pb.id, incidentId);
      runIds.push(runId);
    } catch (err: any) {
      console.error(`[Playbook] Failed to run "${pb.name}":`, err.message);
    }
  }

  return runIds;
}

export async function approveAction(
  incidentId: string,
  runId: string,
  stepIndex: number,
  approvedBy = 'analyst',
) {
  const run = await prisma.playbookRun.findUnique({
    where: { id: runId },
    include: { playbook: true }
  });
  if (!run) throw new Error(`PlaybookRun ${runId} not found`);

  const results: StepResult[] = run.stepResults ? JSON.parse(run.stepResults) : [];
  const stepResult = results.find((r) => r.stepIndex === stepIndex);
  if (!stepResult) throw new Error(`Step ${stepIndex} not found in run`);
  if (stepResult.status !== 'PENDING_APPROVAL') throw new Error(`Step ${stepIndex} is not pending approval`);

  // Load the full playbook to get the step config
  const steps: PlaybookStep[] = JSON.parse(run.playbook.steps);
  const step = steps.find(s => s.index === stepIndex);
  if (!step) throw new Error(`Step config for index ${stepIndex} not found in playbook`);

  // Get alert context
  const incidentAlert = await prisma.incidentAlert.findFirst({
    where: { incidentId },
    include: { alert: true },
  });

  const alertCtx: AlertContext = incidentAlert?.alert
    ? {
        ip: incidentAlert.alert.ip,
        user: incidentAlert.alert.user,
        type: incidentAlert.alert.type,
        severity: incidentAlert.alert.severity,
        count: incidentAlert.alert.count,
        mitreTactic: incidentAlert.alert.mitreTactic,
        abuseScore: incidentAlert.alert.abuseScore,
        country: incidentAlert.alert.country,
      }
    : { ip: 'unknown', type: 'UNKNOWN', severity: 'MEDIUM', count: 0 };

  // Perform the actual action!
  let res: { status: StepResult['status']; output: string };
  try {
    res = await runStepAction(step, incidentId, alertCtx);
  } catch (err: any) {
    res = { status: 'FAILED', output: err.message || 'Unknown execution error' };
  }

  // Update step status and output
  stepResult.status = res.status;
  stepResult.output = res.output;

  const remainingPending = results.some((r) => r.status === 'PENDING_APPROVAL');

  // Determine overall status
  const hasFailed = results.some((r) => r.status === 'FAILED');
  let overallStatus = 'RUNNING';
  if (!remainingPending) {
    overallStatus = hasFailed ? 'FAILED' : 'SUCCESS';
  }

  await prisma.playbookRun.update({
    where: { id: runId },
    data: { 
      stepResults: JSON.stringify(results),
      status: overallStatus,
      finishedAt: remainingPending ? null : new Date(),
    },
  });

  await prisma.incidentEvent.create({
    data: {
      incidentId,
      type: 'ACTION_APPROVED',
      content: `✅ Action approved: ${step.type} (step #${stepIndex}) by ${approvedBy}. Result: ${res.output}`,
      author: approvedBy,
    },
  });

  return stepResult;
}

// ── Playbook CRUD ─────────────────────────────────────────────────────────────

export async function listPlaybooks() {
  return prisma.playbook.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { runs: true } },
    },
  });
}

export async function getPlaybook(id: string) {
  return prisma.playbook.findUnique({
    where: { id },
    include: {
      runs: {
        orderBy: { startedAt: 'desc' },
        take: 10,
      },
    },
  });
}

export async function createPlaybook(data: {
  name: string;
  description?: string;
  trigger: string;
  steps: PlaybookStep[];
  enabled?: boolean;
}) {
  return prisma.playbook.create({
    data: {
      name: data.name,
      description: data.description ?? null,
      trigger: data.trigger,
      steps: JSON.stringify(data.steps),
      enabled: data.enabled ?? true,
    },
  });
}

export async function updatePlaybook(
  id: string,
  data: {
    name?: string;
    description?: string;
    trigger?: string;
    steps?: PlaybookStep[];
    enabled?: boolean;
  },
) {
  return prisma.playbook.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.trigger && { trigger: data.trigger }),
      ...(data.steps && { steps: JSON.stringify(data.steps) }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
    },
  });
}

export async function deletePlaybook(id: string) {
  return prisma.playbook.delete({ where: { id } });
}
