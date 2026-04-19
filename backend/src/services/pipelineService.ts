import { parseLogFile } from './parserService';
import { runDetection } from './detectionService';
import { runCorrelation } from './correlationService';
import { enrichAlerts } from './enrichmentService';
import { aggregateAlerts } from './aggregationService';
import prisma from '../utils/prisma';
import { AnalyticsData } from '../utils/types';

/**
 * Main processing pipeline:
 * Upload → Parse → Detect → Correlate → Enrich → Aggregate → Store
 */
export async function processLogFile(fileName: string, fileContent: string) {
  // 1. Create a new session
  const session = await prisma.session.create({
    data: { fileName },
  });

  // 2. Parse log file
  const parsedLogs = parseLogFile(fileContent);

  // 3. Store parsed logs in DB
  if (parsedLogs.length > 0) {
    await prisma.log.createMany({
      data: parsedLogs.map((log) => ({
        sessionId: session.id,
        rawLog: log.rawLog,
        parsedJson: JSON.stringify({
          eventType: log.eventType,
          user: log.user,
          ip: log.ip,
        }),
        timestamp: log.timestamp,
      })),
    });
  }

  // 4. Run detection rules
  const detectionAlerts = runDetection(parsedLogs);

  // 5. Run correlation engine
  const correlationAlerts = runCorrelation(parsedLogs);

  // 6. Combine all alerts
  const allAlerts = [...detectionAlerts, ...correlationAlerts];

  // 7. Aggregate duplicates
  const aggregatedAlerts = aggregateAlerts(allAlerts);

  // 8. Enrich with MITRE, explanations, reputation
  const enrichedAlerts = enrichAlerts(aggregatedAlerts);

  // 9. Store alerts in DB
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
      })),
    });
  }

  return {
    sessionId: session.id,
    logsProcessed: parsedLogs.length,
    alertsGenerated: enrichedAlerts.length,
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
