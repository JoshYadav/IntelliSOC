import { ParsedLog, DetectionAlert } from '../utils/types';

const PORT_SCAN_WINDOW_MS  = 2 * 60 * 1000; // 2 minutes
const PORT_SCAN_THRESHOLD  = 10;             // distinct destination ports

// ── Port Scan ─────────────────────────────────────────────────────────────────
function detectPortScan(logs: ParsedLog[]): DetectionAlert[] {
  const alerts: DetectionAlert[] = [];

  // Group DENY/all firewall events by source IP
  const ipEvents: Map<string, ParsedLog[]> = new Map();

  for (const log of logs) {
    const src = log.srcIp || log.ip;
    if (!src || src === 'UNKNOWN') continue;
    const arr = ipEvents.get(src) || [];
    arr.push(log);
    ipEvents.set(src, arr);
  }

  for (const [ip, events] of ipEvents) {
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let start = 0;
    const windowPorts = new Set<number>();

    for (let i = 0; i < events.length; i++) {
      while (
        start < i &&
        events[i].timestamp.getTime() - events[start].timestamp.getTime() > PORT_SCAN_WINDOW_MS
      ) {
        if (events[start].dstPort !== undefined) windowPorts.delete(events[start].dstPort!);
        start++;
      }
      if (events[i].dstPort !== undefined) windowPorts.add(events[i].dstPort!);

      if (
        windowPorts.size >= PORT_SCAN_THRESHOLD &&
        !alerts.some((a) => a.ip === ip && a.type === 'PORT_SCAN')
      ) {
        alerts.push({
          type: 'PORT_SCAN',
          ip,
          severity: 'HIGH',
          riskScore: 75,
          count: windowPorts.size,
          timestamp: events[i].timestamp,
          explanation: `Source IP ${ip} hit ${windowPorts.size} distinct destination ports within 2 minutes (ports: ${[...windowPorts].slice(0, 10).join(', ')}${windowPorts.size > 10 ? '...' : ''}). This is consistent with automated port scanning activity.`,
        });
        break;
      }
    }
  }
  return alerts;
}

export function runFirewallDetection(logs: ParsedLog[]): DetectionAlert[] {
  return detectPortScan(logs);
}
