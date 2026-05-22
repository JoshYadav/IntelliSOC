import { ParsedLog, DetectionAlert } from '../utils/types';

const TIME_WINDOW_MS      = 2 * 60 * 1000; // 2-minute sliding window
const BRUTE_FORCE_THRESHOLD = 5;
const MULTI_USER_THRESHOLD  = 3;
const SUDO_WINDOW_MS       = 5 * 60 * 1000;
const SUDO_THRESHOLD       = 3;

// ── SSH Brute Force ───────────────────────────────────────────────────────────
function detectBruteForce(logs: ParsedLog[]): DetectionAlert[] {
  const alerts: DetectionAlert[] = [];
  const ipFailures: Map<string, ParsedLog[]> = new Map();

  for (const log of logs) {
    if (log.eventType === 'LOGIN_FAILED' && log.ip) {
      const arr = ipFailures.get(log.ip) || [];
      arr.push(log);
      ipFailures.set(log.ip, arr);
    }
  }

  for (const [ip, failures] of ipFailures) {
    failures.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let start = 0;
    for (let i = 0; i < failures.length; i++) {
      while (start < i && failures[i].timestamp.getTime() - failures[start].timestamp.getTime() > TIME_WINDOW_MS) start++;
      const windowCount = i - start + 1;
      if (windowCount > BRUTE_FORCE_THRESHOLD && !alerts.some((a) => a.ip === ip && a.type === 'BRUTE_FORCE')) {
        alerts.push({ type: 'BRUTE_FORCE', ip, user: failures[i].user, severity: 'HIGH', riskScore: 50, count: windowCount, timestamp: failures[i].timestamp });
        break;
      }
    }
  }
  return alerts;
}

// ── SSH Multiple Users ────────────────────────────────────────────────────────
function detectMultipleUsers(logs: ParsedLog[]): DetectionAlert[] {
  const alerts: DetectionAlert[] = [];
  const ipUsers: Map<string, Set<string>> = new Map();

  for (const log of logs) {
    if (log.eventType === 'LOGIN_FAILED' && log.ip && log.user) {
      const s = ipUsers.get(log.ip) || new Set();
      s.add(log.user);
      ipUsers.set(log.ip, s);
    }
  }

  for (const [ip, users] of ipUsers) {
    if (users.size > MULTI_USER_THRESHOLD) {
      alerts.push({ type: 'MULTIPLE_USERS', ip, user: Array.from(users).join(', '), severity: 'MEDIUM', riskScore: 40, count: users.size, timestamp: new Date() });
    }
  }
  return alerts;
}

// ── Sudo Abuse ────────────────────────────────────────────────────────────────
function detectSudoAbuse(logs: ParsedLog[]): DetectionAlert[] {
  const alerts: DetectionAlert[] = [];
  const userSudos: Map<string, ParsedLog[]> = new Map();

  for (const log of logs) {
    if (log.eventType === 'SUDO_COMMAND' && log.user) {
      const arr = userSudos.get(log.user) || [];
      arr.push(log);
      userSudos.set(log.user, arr);
    }
  }

  for (const [user, entries] of userSudos) {
    entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let start = 0;
    for (let i = 0; i < entries.length; i++) {
      while (start < i && entries[i].timestamp.getTime() - entries[start].timestamp.getTime() > SUDO_WINDOW_MS) start++;
      const windowCount = i - start + 1;
      if (windowCount > SUDO_THRESHOLD && !alerts.some((a) => a.user === user && a.type === 'SUDO_ABUSE')) {
        alerts.push({ type: 'SUDO_ABUSE', ip: 'LOCAL', user, severity: 'MEDIUM', riskScore: 45, count: windowCount, timestamp: entries[i].timestamp,
          explanation: `User "${user}" executed ${windowCount} sudo commands within 5 minutes, indicating potential privilege escalation.` });
        break;
      }
    }
  }
  return alerts;
}

export function runDetection(logs: ParsedLog[]): DetectionAlert[] {
  return [
    ...detectBruteForce(logs),
    ...detectMultipleUsers(logs),
    ...detectSudoAbuse(logs),
  ];
}

export { detectBruteForce, detectMultipleUsers, detectSudoAbuse };
