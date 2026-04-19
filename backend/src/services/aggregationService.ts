import { DetectionAlert } from '../utils/types';

/**
 * Aggregate duplicate alerts by (IP + type).
 * Instead of creating multiple alerts for the same IP and attack type,
 * group them and maintain a count field.
 */
export function aggregateAlerts(alerts: DetectionAlert[]): DetectionAlert[] {
  const aggregated: Map<string, DetectionAlert> = new Map();

  for (const alert of alerts) {
    const key = `${alert.ip}::${alert.type}`;

    if (aggregated.has(key)) {
      const existing = aggregated.get(key)!;
      existing.count += alert.count;
      // Keep the highest risk score
      if (alert.riskScore > existing.riskScore) {
        existing.riskScore = alert.riskScore;
        existing.severity = alert.severity;
      }
      // Keep the latest timestamp
      if (alert.timestamp > existing.timestamp) {
        existing.timestamp = alert.timestamp;
      }
      // Merge user info
      if (alert.user && existing.user && !existing.user.includes(alert.user)) {
        existing.user = `${existing.user}, ${alert.user}`;
      }
    } else {
      aggregated.set(key, { ...alert });
    }
  }

  return Array.from(aggregated.values());
}
