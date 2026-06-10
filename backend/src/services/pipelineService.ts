import { parseLogFile, detectFormat } from './parserService';
import { runDetection } from './detectionService';
import { runHttpDetection } from './httpDetectionService';
import { runWindowsDetection } from './windowsDetectionService';
import { runSysmonDetection } from './sysmonDetectionService';
import { runFirewallDetection } from './firewallDetectionService';
import { runCorrelation } from './correlationService';
import { enrichAlerts } from './enrichmentService';
import { aggregateAlerts } from './aggregationService';
import { autoGroupAlerts } from './incidentService';
import { triggerMatchingPlaybooks } from './playbookService';
import { upsertEndpoint, storeTelemetry } from './endpointService';
import { runEdrDetection } from './edrDetectionService';
import prisma from '../utils/prisma';
import { AnalyticsData, LogFormat, DetectionAlert } from '../utils/types';

/**
 * Main processing pipeline:
 * Upload → Detect Format → Parse → Detect → Correlate → Enrich → Aggregate → Store → SOAR
 */
export async function processLogFile(fileName: string, fileContent: string) {
  // 1. Auto-detect log format
  const logFormat: LogFormat = detectFormat(fileContent);
  console.log(`[Pipeline] Auto-detected format: ${logFormat} for file: ${fileName}`);

  // 2. Create a new session (with detected format)
  const session = await prisma.session.create({
    data: { fileName, logFormat },
  });

  // 3. Parse log file with detected format
  const parsedLogs = parseLogFile(fileContent, logFormat);

  let edrAlerts: DetectionAlert[] = [];
  // --- EDR INTEGRATION ---
  try {
    const endpointsToUpsert = new Set<string>();
    for (const log of parsedLogs) {
      if (log.computer && log.computer !== 'LOCAL') {
        endpointsToUpsert.add(log.computer);
      } else if (log.ip && log.ip !== 'LOCAL' && log.ip !== 'UNKNOWN') {
        endpointsToUpsert.add(log.ip);
      }
    }

    // Upsert all discovered endpoints
    const endpointMap = new Map<string, string>(); // hostname -> endpointId
    for (const hostname of endpointsToUpsert) {
      const ep = await upsertEndpoint(hostname);
      endpointMap.set(hostname, ep.id);
    }

    if (logFormat === 'SYSMON' || logFormat === 'SSH_AUTH') {
      const hostTelemetry = new Map<string, { process: any[]; network: any[]; file: any[] }>();

      for (const hostname of endpointsToUpsert) {
        hostTelemetry.set(hostname, { process: [], network: [], file: [] });
      }

      for (const log of parsedLogs) {
        const hostname = log.computer || log.ip || '';
        const hostData = hostTelemetry.get(hostname);
        if (!hostData) continue;

        if (log.eventType === 'SYSMON_PROCESS_CREATE') {
          hostData.process.push({
            pid: log.processGuid ? parseInt(log.processGuid.replace(/[^0-9]/g, '').slice(0,6) || '0', 10) : 0,
            name: log.image ? log.image.split('\\').pop() : 'unknown',
            path: log.image,
            commandLine: log.commandLine,
            parentPid: 0
          });
        } else if (log.eventType === 'SYSMON_NETWORK_CONNECT') {
          hostData.network.push({
            localAddress: '0.0.0.0',
            localPort: 0,
            remoteAddress: log.destinationIp || '0.0.0.0',
            remotePort: log.destinationPort || 0,
            state: 'ESTABLISHED',
            pid: log.processGuid ? parseInt(log.processGuid.replace(/[^0-9]/g, '').slice(0,6) || '0', 10) : 0,
          });
        } else if (log.eventType === 'SYSMON_FILE_CREATE') {
          hostData.file.push({
            path: log.targetFilename || log.image || 'unknown',
            operation: 'CREATE'
          });
        }
      }

      for (const [hostname, data] of hostTelemetry) {
        const endpointId = endpointMap.get(hostname);
        if (!endpointId) continue;

        if (data.process.length > 0) {
          await storeTelemetry(endpointId, 'PROCESS', data.process);
          const alerts = await runEdrDetection(hostname, 'PROCESS', data.process, false);
          edrAlerts.push(...alerts.map(a => ({ ...a, ip: a.hostname, user: undefined, timestamp: new Date() } as DetectionAlert)));
        }
        if (data.network.length > 0) {
          await storeTelemetry(endpointId, 'NETWORK', data.network);
          const alerts = await runEdrDetection(hostname, 'NETWORK', data.network, false);
          edrAlerts.push(...alerts.map(a => ({ ...a, ip: a.hostname, user: undefined, timestamp: new Date() } as DetectionAlert)));
        }
        if (data.file.length > 0) {
          await storeTelemetry(endpointId, 'FILE', data.file);
          const alerts = await runEdrDetection(hostname, 'FILE', data.file, false);
          edrAlerts.push(...alerts.map(a => ({ ...a, ip: a.hostname, user: undefined, timestamp: new Date() } as DetectionAlert)));
        }
      }
    }
  } catch (err: any) {
    console.error('[Pipeline] EDR integration error:', err.message);
  }
  // --- END EDR INTEGRATION ---

  // 4. Store parsed logs in DB
  if (parsedLogs.length > 0) {
    await prisma.log.createMany({
      data: parsedLogs.map((log) => ({
        sessionId: session.id,
        rawLog: log.rawLog,
        parsedJson: JSON.stringify({
          format: log.format,
          eventType: log.eventType,
          user: log.user,
          ip: log.ip,
          // HTTP fields
          method: log.method,
          url: log.url,
          statusCode: log.statusCode,
          // Windows fields
          eventId: log.eventId,
          computer: log.computer,
          logonType: log.logonType,
          // Sysmon fields
          image: log.image,
          commandLine: log.commandLine,
          parentImage: log.parentImage,
          destinationIp: log.destinationIp,
          // Firewall fields
          srcIp: log.srcIp,
          dstIp: log.dstIp,
          dstPort: log.dstPort,
          action: log.action,
          protocol: log.protocol,
        }),
        timestamp: log.timestamp,
      })),
    });
  }

  // 5. Run format-specific detection rules
  let detectionAlerts: DetectionAlert[] = [];

  switch (logFormat) {
    case 'SSH_AUTH':
      detectionAlerts = runDetection(parsedLogs);
      break;
    case 'APACHE':
    case 'NGINX':
      detectionAlerts = runHttpDetection(parsedLogs);
      break;
    case 'WINDOWS_EVENT':
      detectionAlerts = runWindowsDetection(parsedLogs);
      break;
    case 'SYSMON':
      detectionAlerts = runSysmonDetection(parsedLogs);
      break;
    case 'FIREWALL':
      detectionAlerts = runFirewallDetection(parsedLogs);
      break;
    default:
      // Unknown format — try SSH detection as best-effort
      detectionAlerts = runDetection(parsedLogs);
      break;
  }

  // 6. Run correlation engine (works across all formats with LOGIN_FAILED/SUCCESS)
  const correlationAlerts = runCorrelation(parsedLogs);

  // 7. Combine all alerts
  const allAlerts = [...detectionAlerts, ...correlationAlerts, ...edrAlerts];

  // 8. Aggregate duplicates
  const aggregatedAlerts = aggregateAlerts(allAlerts);

  // 9. Enrich with MITRE, explanations, and AbuseIPDB reputation
  const enrichedAlerts = await enrichAlerts(aggregatedAlerts);

  // 10. Store alerts in DB
  if (enrichedAlerts.length > 0) {
    await prisma.alert.createMany({
      data: enrichedAlerts.map((alert) => ({
        sessionId: session.id,
        type: alert.type,
        ip: alert.ip,
        user: alert.user || null,
        severity: alert.severity,
        riskScore: alert.riskScore,
        mitreTactic: alert.mitreTactic || null,
        explanation: alert.explanation || null,
        reputation: alert.reputation || null,
        count: alert.count,
        timestamp: alert.timestamp,
        // AbuseIPDB enrichment
        abuseScore: alert.abuseScore ?? null,
        country: alert.country ?? null,
        isp: alert.isp ?? null,
        latitude: alert.latitude ?? null,
        longitude: alert.longitude ?? null,
      })),
    });
  }

  // 11. SOAR Integration — auto-create incidents and trigger playbooks
  let incidentsCreated = 0;
  let incidentId: string | null = null;
  if (enrichedAlerts.length > 0) {
    try {
      const incidentIds = await autoGroupAlerts(session.id);
      incidentsCreated = incidentIds.length;
      if (incidentIds.length > 0) {
        incidentId = incidentIds[0];
      }

      // Trigger matching playbooks for each unique alert type in this session
      const alertTypes = [...new Set(enrichedAlerts.map((a) => a.type))];
      for (const incidentId of incidentIds) {
        for (const alertType of alertTypes) {
          await triggerMatchingPlaybooks(alertType, incidentId).catch((err) => {
            console.error(`[Pipeline] Playbook trigger failed for ${alertType}:`, err.message);
          });
        }
      }
    } catch (err: any) {
      // SOAR failures should not break the core pipeline
      console.error('[Pipeline] SOAR integration error (non-fatal):', err.message);
    }
  }

  return {
    sessionId: session.id,
    logFormat,
    logsProcessed: parsedLogs.length,
    alertsGenerated: enrichedAlerts.length,
    incidentsCreated,
    incidentId,
  };
}

/**
 * Get analytics data for a session.
 */
export async function getSessionAnalytics(sessionId: string): Promise<AnalyticsData> {
  const [alerts, logCount] = await Promise.all([
    prisma.alert.findMany({ where: { sessionId } }),
    prisma.log.count({ where: { sessionId } }),
  ]);

  // Alerts by type
  const alertsByType: Record<string, number> = {};
  const alertsBySeverity: Record<string, number> = {};
  const ipCounts: Map<string, number> = new Map();

  for (const alert of alerts) {
    alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
    alertsBySeverity[alert.severity] = (alertsBySeverity[alert.severity] || 0) + 1;
    ipCounts.set(alert.ip, (ipCounts.get(alert.ip) || 0) + alert.count);
  }

  // Top IPs sorted by activity
  const topIPs = Array.from(ipCounts.entries())
    .map(([ip, count]) => ({ ip, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Risk distribution
  const riskDistribution = [
    { label: 'Critical (80-100)', value: alerts.filter((a) => a.riskScore >= 80).length },
    { label: 'High (50-79)', value: alerts.filter((a) => a.riskScore >= 50 && a.riskScore < 80).length },
    { label: 'Medium (30-49)', value: alerts.filter((a) => a.riskScore >= 30 && a.riskScore < 50).length },
    { label: 'Low (0-29)', value: alerts.filter((a) => a.riskScore < 30).length },
  ];

  return {
    totalAlerts: alerts.length,
    totalLogs: logCount,
    alertsByType,
    alertsBySeverity,
    topIPs,
    riskDistribution,
  };
}
