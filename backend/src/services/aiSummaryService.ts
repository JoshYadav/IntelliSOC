import prisma from '../utils/prisma';

// ── Gemini AI summary generation ──────────────────────────────────────────────

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'gemini-1.5-flash';

/**
 * Build the structured prompt from incident data.
 */
function buildPrompt(incident: {
  title: string;
  alerts: {
    alert: {
      type: string;
      ip: string;
      user: string | null;
      severity: string;
      riskScore: number;
      count: number;
      mitreTactic: string | null;
      explanation: string | null;
      abuseScore: number | null;
      country: string | null;
      isp: string | null;
      timestamp: Date;
    };
  }[];
  session?: { fileName: string; logFormat: string } | null;
}): string {
  const alerts = incident.alerts.map((ia) => ia.alert);

  // Aggregate stats
  const totalAlerts = alerts.length;
  const highestSeverity = alerts.reduce((max, a) => {
    const order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    return order.indexOf(a.severity) > order.indexOf(max) ? a.severity : max;
  }, 'LOW');

  const alertBreakdown: Record<string, number> = {};
  alerts.forEach((a) => {
    alertBreakdown[a.type] = (alertBreakdown[a.type] || 0) + 1;
  });

  const topIPs = [...new Map(alerts.map((a) => [a.ip, a])).values()]
    .map((a) => `${a.ip} (${a.country ?? '??'}, AbuseIPDB: ${a.abuseScore ?? 'N/A'})`)
    .slice(0, 5);

  const tactics = [...new Set(alerts.filter((a) => a.mitreTactic).map((a) => a.mitreTactic))];

  const timestamps = alerts.map((a) => a.timestamp).sort();
  const firstEvent = timestamps[0]?.toISOString() ?? 'unknown';
  const lastEvent = timestamps[timestamps.length - 1]?.toISOString() ?? 'unknown';

  const top5 = alerts
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 5)
    .map((a) => ({
      type: a.type,
      ip: a.ip,
      user: a.user,
      severity: a.severity,
      riskScore: a.riskScore,
      explanation: a.explanation,
    }));

  return `You are a senior SOC analyst. Analyse the following security incident data and provide:
1. A 3-sentence executive summary of what happened
2. The most likely attacker objective (reconnaissance / initial access / exfiltration / etc.)
3. Three specific recommended next actions for the analyst

INCIDENT DATA:
- Incident: ${incident.title}
- Total alerts: ${totalAlerts}  |  Highest severity: ${highestSeverity}
- Top attacker IPs: ${topIPs.join(', ')}
- MITRE tactics observed: ${tactics.join(', ') || 'None mapped'}
- Alert breakdown: ${JSON.stringify(alertBreakdown)}
- Timeline: first event ${firstEvent} → last event ${lastEvent}
- Top 5 alerts by risk score: ${JSON.stringify(top5)}

Respond in plain English. Be specific about IP addresses, usernames, and attack patterns.
Format:
SUMMARY: <text>
OBJECTIVE: <text>
ACTIONS:
1. <text>
2. <text>
3. <text>`;
}

/**
 * Call Gemini API to generate content.
 */
async function callGemini(prompt: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[AI] GEMINI_API_KEY not set — skipping AI summary.');
    return null;
  }

  try {
    const url = `${GEMINI_API_BASE}/${MODEL}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[AI] Gemini API error (HTTP ${response.status}):`, errText);
      return null;
    }

    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    return json.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err: any) {
    console.error('[AI] Gemini call failed:', err.message);
    return null;
  }
}

function generateOfflineSummary(incident: {
  title: string;
  alerts: {
    alert: {
      type: string;
      ip: string;
      user: string | null;
      severity: string;
      riskScore: number;
      count: number;
      mitreTactic: string | null;
      explanation: string | null;
      abuseScore: number | null;
      country: string | null;
      isp: string | null;
      timestamp: Date;
    };
  }[];
}): string {
  const alerts = incident.alerts.map((ia) => ia.alert);
  const totalAlerts = alerts.length;
  const highestSeverity = alerts.reduce((max, a) => {
    const order = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    return order.indexOf(a.severity) > order.indexOf(max) ? a.severity : max;
  }, 'LOW');

  const alertTypes = [...new Set(alerts.map((a) => a.type))];
  const uniqueIPs = [...new Set(alerts.map((a) => a.ip))];
  const topIP = uniqueIPs[0] || 'unknown';
  const affectedUsers = [...new Set(alerts.map((a) => a.user).filter(Boolean))];
  const userStr = affectedUsers.length > 0 ? `targeting account(s): ${affectedUsers.join(', ')}` : 'targeting system resources';

  let summaryText = `An active security incident "${incident.title}" has been identified involving ${totalAlerts} correlated alert(s). `;
  summaryText += `The threat actor is operating from source IP ${topIP}, ${userStr}. `;
  summaryText += `The highest detected alert severity is ${highestSeverity}, which requires immediate analyst intervention.`;

  let objective = 'Unauthorized access / Credential harvesting / Initial access';
  if (alertTypes.some(t => t.includes('BRUTE_FORCE'))) {
    objective = 'Credential stuffing and brute-force targeting administrative/user accounts to gain initial access.';
  } else if (alertTypes.some(t => t.includes('MALWARE') || t.includes('LOLBIN') || t.includes('POWERSHELL'))) {
    objective = 'Execution of unauthorized commands, system binary proxy execution, or malware injection to establish control.';
  } else if (alertTypes.some(t => t.includes('CREDENTIAL_DUMPING'))) {
    objective = 'Credential harvesting from LSASS memory to extract valid domain or local system credentials.';
  } else if (alertTypes.some(t => t.includes('PORT_SCAN') || t.includes('DIRECTORY_SCAN'))) {
    objective = 'Reconnaissance and mapping of active services or web directories to identify exploitable entry points.';
  }

  let actions = [
    `Verify the reputation and logs of source IP ${topIP} using external threat intelligence platforms.`,
    `Review login events, session details, and command-line arguments associated with targeted user account(s).`,
    `Apply firewall block rules for ${topIP} and initiate credentials reset or host isolation if compromise is confirmed.`
  ];

  if (alertTypes.some(t => t.includes('CREDENTIAL_DUMPING') || t.includes('PERSISTENCE') || t.includes('RUN_KEY') || t.includes('SCHEDULED_TASK'))) {
    actions = [
      `Isolate the affected endpoint immediately to prevent lateral movement within the network.`,
      `Perform a full malware scan, clean up any persistent registries or scheduled tasks, and dump process memory logs for forensics.`,
      `Revoke all credentials stored on the host machine and enforce a password reset policy for the compromised users.`
    ];
  }

  return `SUMMARY: ${summaryText}
OBJECTIVE: ${objective}
ACTIONS:
1. ${actions[0]}
2. ${actions[1]}
3. ${actions[2]}`;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate an AI incident summary using Gemini and store it on the incident.
 * Returns the cached summary if one already exists (pass `force = true` to regenerate).
 */
export async function generateIncidentSummary(
  incidentId: string,
  force = false,
): Promise<string | null> {
  const incident = await prisma.incident.findUnique({
    where: { id: incidentId },
    include: {
      alerts: {
        include: { alert: true },
      },
    },
  });

  if (!incident) {
    console.warn(`[AI] Incident ${incidentId} not found`);
    return null;
  }

  // Return cached summary unless forced
  if (incident.aiSummary && !force) {
    return incident.aiSummary;
  }

  if (incident.alerts.length === 0) {
    console.warn(`[AI] Incident ${incidentId} has no linked alerts — skipping summary`);
    return null;
  }

  const prompt = buildPrompt(incident);
  let summary = await callGemini(prompt);

  if (!summary) {
    console.warn(`[AI] GEMINI_API_KEY not set or Gemini call failed — using offline fallback summary for incident ${incidentId}`);
    summary = generateOfflineSummary(incident);
  }

  if (summary) {
    // Store on the incident
    await prisma.incident.update({
      where: { id: incidentId },
      data: { aiSummary: summary },
    });

    // Log timeline event
    await prisma.incidentEvent.create({
      data: {
        incidentId,
        type: 'NOTE',
        content: '🤖 AI incident summary generated (fallback)',
        author: 'system',
      },
    });

    console.log(`[AI] Summary generated for incident ${incidentId}`);
  }

  return summary;
}
