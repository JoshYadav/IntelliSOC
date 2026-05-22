import { ParsedLog, DetectionAlert } from '../utils/types';

const BRUTE_WINDOW_MS   = 2 * 60 * 1000;  // 2 minutes
const BRUTE_THRESHOLD   = 5;               // 4625 failures
const PERSIST_WINDOW_MS = 60 * 1000;       // 60 seconds between 4720→4726
const LATERAL_WINDOW_MS = 5 * 60 * 1000;  // 5 minutes
const LATERAL_THRESHOLD = 3;               // distinct computers via 4648

// ── Windows Brute Force (repeated 4625) ───────────────────────────────────────
function detectWindowsBruteForce(logs: ParsedLog[]): DetectionAlert[] {
  const alerts: DetectionAlert[] = [];
  const ipHits: Map<string, ParsedLog[]> = new Map();

  for (const log of logs) {
    if (log.eventType === 'WIN_LOGON_FAILED' && log.ip && log.ip !== 'LOCAL') {
      const arr = ipHits.get(log.ip) || [];
      arr.push(log);
      ipHits.set(log.ip, arr);
    }
  }

  for (const [ip, failures] of ipHits) {
    failures.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let start = 0;
    for (let i = 0; i < failures.length; i++) {
      while (start < i && failures[i].timestamp.getTime() - failures[start].timestamp.getTime() > BRUTE_WINDOW_MS) start++;
      const count = i - start + 1;
      if (count > BRUTE_THRESHOLD && !alerts.some((a) => a.ip === ip && a.type === 'WINDOWS_BRUTE_FORCE')) {
        alerts.push({
          type: 'WINDOWS_BRUTE_FORCE',
          ip,
          user: failures[i].user,
          severity: 'HIGH',
          riskScore: 70,
          count,
          timestamp: failures[i].timestamp,
          explanation: `IP ${ip} caused ${count} Windows logon failures (EventID 4625) within 2 minutes — credential brute force against Windows authentication.`,
        });
        break;
      }
    }
  }
  return alerts;
}

// ── Persistence: 4720 (create) → 4726 (delete) rapid cycle ───────────────────
function detectPersistence(logs: ParsedLog[]): DetectionAlert[] {
  const alerts: DetectionAlert[] = [];
  const created: Map<string, ParsedLog> = new Map(); // username → create event

  const sorted = [...logs].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  for (const log of sorted) {
    if (log.eventType === 'WIN_ACCOUNT_CREATED' && log.user) {
      created.set(log.user, log);
    }
    if (log.eventType === 'WIN_ACCOUNT_DELETED' && log.user) {
      const createEvent = created.get(log.user);
      if (
        createEvent &&
        log.timestamp.getTime() - createEvent.timestamp.getTime() <= PERSIST_WINDOW_MS &&
        !alerts.some((a) => a.user === log.user && a.type === 'PERSISTENCE_DETECTED')
      ) {
        alerts.push({
          type: 'PERSISTENCE_DETECTED',
          ip: log.computer ?? 'LOCAL',
          user: log.user,
          severity: 'CRITICAL',
          riskScore: 85,
          count: 1,
          timestamp: log.timestamp,
          explanation: `Account "${log.user}" was created (EventID 4720) and deleted (EventID 4726) within 60 seconds on ${log.computer ?? 'LOCAL'} — classic persistence via ephemeral account creation.`,
        });
        created.delete(log.user);
      }
    }
  }
  return alerts;
}

// ── Lateral Movement: repeated 4648 (explicit creds) across computers ────────
function detectLateralMovement(logs: ParsedLog[]): DetectionAlert[] {
  const alerts: DetectionAlert[] = [];
  const userEvents: Map<string, ParsedLog[]> = new Map();

  for (const log of logs) {
    if (log.eventType === 'WIN_EXPLICIT_CRED' && log.user) {
      const arr = userEvents.get(log.user) || [];
      arr.push(log);
      userEvents.set(log.user, arr);
    }
  }

  for (const [user, events] of userEvents) {
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let start = 0;
    for (let i = 0; i < events.length; i++) {
      while (start < i && events[i].timestamp.getTime() - events[start].timestamp.getTime() > LATERAL_WINDOW_MS) start++;
      const window = events.slice(start, i + 1);
      const computers = new Set(window.map((e) => e.computer).filter(Boolean));
      if (
        computers.size >= LATERAL_THRESHOLD &&
        !alerts.some((a) => a.user === user && a.type === 'LATERAL_MOVEMENT')
      ) {
        alerts.push({
          type: 'LATERAL_MOVEMENT',
          ip: events[i].ip ?? 'LOCAL',
          user,
          severity: 'CRITICAL',
          riskScore: 88,
          count: computers.size,
          timestamp: events[i].timestamp,
          explanation: `User "${user}" used explicit credentials (EventID 4648) to authenticate to ${computers.size} different machines within 5 minutes: ${[...computers].join(', ')}. This is a lateral movement pattern.`,
        });
        break;
      }
    }
  }
  return alerts;
}

export function runWindowsDetection(logs: ParsedLog[]): DetectionAlert[] {
  return [
    ...detectWindowsBruteForce(logs),
    ...detectPersistence(logs),
    ...detectLateralMovement(logs),
  ];
}
