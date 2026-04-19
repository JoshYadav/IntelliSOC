import { ParsedLog, DetectionAlert } from '../utils/types';

const TIME_WINDOW_MS = 2 * 60 * 1000; // 2-minute sliding window
const BRUTE_FORCE_THRESHOLD = 5;
const MULTI_USER_THRESHOLD = 3;

/**
 * Detect brute force attacks: > 5 failed logins from same IP within time window.
 */
function detectBruteForce(logs: ParsedLog[]): DetectionAlert[] {
  const alerts: DetectionAlert[] = [];
  const ipFailures: Map<string, ParsedLog[]> = new Map();

  // Group failed logins by IP
  for (const log of logs) {
    if (log.eventType === 'LOGIN_FAILED') {
      const existing = ipFailures.get(log.ip) || [];
      existing.push(log);
      ipFailures.set(log.ip, existing);
    }
  }

  // Check each IP against threshold within time window
  for (const [ip, failures] of ipFailures) {
    // Sort by timestamp
    failures.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // Sliding window check
    let windowStart = 0;
    for (let i = 0; i < failures.length; i++) {
      // Move window start forward until within TIME_WINDOW_MS
      while (
        windowStart < i &&
        failures[i].timestamp.getTime() - failures[windowStart].timestamp.getTime() > TIME_WINDOW_MS
      ) {
        windowStart++;
      }

      const windowCount = i - windowStart + 1;
      if (windowCount > BRUTE_FORCE_THRESHOLD) {
        // Only create alert once per IP
        if (!alerts.some(a => a.ip === ip && a.type === 'BRUTE_FORCE')) {
          alerts.push({
            type: 'BRUTE_FORCE',
            ip,
            user: failures[i].user,
            severity: 'HIGH',
            riskScore: 50,
            count: windowCount,
            timestamp: failures[i].timestamp,
          });
        }
        break;
      }
    }
  }

  return alerts;
}

/**
 * Detect suspicious activity: > 3 unique users attempted from same IP.
 */
function detectMultipleUsers(logs: ParsedLog[]): DetectionAlert[] {
  const alerts: DetectionAlert[] = [];
  const ipUsers: Map<string, Set<string>> = new Map();

  for (const log of logs) {
    if (log.eventType === 'LOGIN_FAILED' && log.user) {
      const users = ipUsers.get(log.ip) || new Set();
      users.add(log.user);
      ipUsers.set(log.ip, users);
    }
  }

  for (const [ip, users] of ipUsers) {
    if (users.size > MULTI_USER_THRESHOLD) {
      alerts.push({
        type: 'MULTIPLE_USERS',
        ip,
        user: Array.from(users).join(', '),
        severity: 'MEDIUM',
        riskScore: 40,
        count: users.size,
        timestamp: new Date(),
      });
    }
  }

  return alerts;
}

/**
 * Run all detection rules against parsed logs.
 */
export function runDetection(logs: ParsedLog[]): DetectionAlert[] {
  const bruteForceAlerts = detectBruteForce(logs);
  const multiUserAlerts = detectMultipleUsers(logs);
  return [...bruteForceAlerts, ...multiUserAlerts];
}

export { detectBruteForce, detectMultipleUsers };
