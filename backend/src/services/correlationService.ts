import { ParsedLog, DetectionAlert } from '../utils/types';

const CORRELATION_FAILURE_THRESHOLD = 5;

/**
 * Correlation Engine: Detect account compromise.
 * If an IP has > 5 failed logins followed by a successful login,
 * this indicates a likely account compromise.
 */
export function runCorrelation(logs: ParsedLog[]): DetectionAlert[] {
  const alerts: DetectionAlert[] = [];

  // Group logs by IP, ordered by timestamp
  const ipLogs: Map<string, ParsedLog[]> = new Map();
  for (const log of logs) {
    if (log.eventType === 'LOGIN_FAILED' || log.eventType === 'LOGIN_SUCCESS') {
      const existing = ipLogs.get(log.ip) || [];
      existing.push(log);
      ipLogs.set(log.ip, existing);
    }
  }

  for (const [ip, logEntries] of ipLogs) {
    // Sort by timestamp
    logEntries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    let failureCount = 0;
    let failedUsers = new Set<string>();

    for (const entry of logEntries) {
      if (entry.eventType === 'LOGIN_FAILED') {
        failureCount++;
        failedUsers.add(entry.user);
      } else if (entry.eventType === 'LOGIN_SUCCESS') {
        // Check if there were enough failures before this success
        if (failureCount >= CORRELATION_FAILURE_THRESHOLD) {
          alerts.push({
            type: 'ACCOUNT_COMPROMISE',
            ip,
            user: entry.user,
            severity: 'CRITICAL',
            riskScore: 90,
            count: 1,
            timestamp: entry.timestamp,
            explanation: `Account "${entry.user}" was successfully accessed from ${ip} after ${failureCount} failed login attempts. This strongly suggests a brute force attack succeeded.`,
          });
        }
        // Reset counters after a success
        failureCount = 0;
        failedUsers.clear();
      }
    }
  }

  return alerts;
}
