import { ParsedLog, DetectionAlert } from '../utils/types';

const HTTP_BRUTE_WINDOW_MS   = 5 * 60 * 1000; // 5 minutes
const HTTP_BRUTE_THRESHOLD   = 20;             // 401/403 hits
const DIR_SCAN_WINDOW_MS     = 2 * 60 * 1000; // 2 minutes
const DIR_SCAN_THRESHOLD     = 15;             // unique URLs

// ── HTTP Brute Force ──────────────────────────────────────────────────────────
function detectHttpBruteForce(logs: ParsedLog[]): DetectionAlert[] {
  const alerts: DetectionAlert[] = [];
  const ipHits: Map<string, ParsedLog[]> = new Map();

  for (const log of logs) {
    if (
      log.eventType === 'HTTP_REQUEST' &&
      log.ip &&
      (log.statusCode === 401 || log.statusCode === 403)
    ) {
      const arr = ipHits.get(log.ip) || [];
      arr.push(log);
      ipHits.set(log.ip, arr);
    }
  }

  for (const [ip, hits] of ipHits) {
    hits.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let start = 0;
    for (let i = 0; i < hits.length; i++) {
      while (
        start < i &&
        hits[i].timestamp.getTime() - hits[start].timestamp.getTime() > HTTP_BRUTE_WINDOW_MS
      ) start++;
      const count = i - start + 1;
      if (count >= HTTP_BRUTE_THRESHOLD && !alerts.some((a) => a.ip === ip && a.type === 'HTTP_BRUTE_FORCE')) {
        alerts.push({
          type: 'HTTP_BRUTE_FORCE',
          ip,
          severity: 'HIGH',
          riskScore: 65,
          count,
          timestamp: hits[i].timestamp,
          explanation: `IP ${ip} triggered ${count} HTTP 401/403 responses within 5 minutes — indicative of a web application brute force attack.`,
        });
        break;
      }
    }
  }
  return alerts;
}

// ── Directory / URL Scanning ──────────────────────────────────────────────────
function detectDirectoryScan(logs: ParsedLog[]): DetectionAlert[] {
  const alerts: DetectionAlert[] = [];
  const ipUrls: Map<string, ParsedLog[]> = new Map();

  for (const log of logs) {
    if (log.eventType === 'HTTP_REQUEST' && log.ip && log.url) {
      const arr = ipUrls.get(log.ip) || [];
      arr.push(log);
      ipUrls.set(log.ip, arr);
    }
  }

  for (const [ip, requests] of ipUrls) {
    requests.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let start = 0;
    let windowUrls = new Set<string>();
    for (let i = 0; i < requests.length; i++) {
      while (
        start < i &&
        requests[i].timestamp.getTime() - requests[start].timestamp.getTime() > DIR_SCAN_WINDOW_MS
      ) {
        windowUrls.delete(requests[start].url!);
        start++;
      }
      windowUrls.add(requests[i].url!);
      if (
        windowUrls.size >= DIR_SCAN_THRESHOLD &&
        !alerts.some((a) => a.ip === ip && a.type === 'DIRECTORY_SCAN')
      ) {
        alerts.push({
          type: 'DIRECTORY_SCAN',
          ip,
          severity: 'MEDIUM',
          riskScore: 55,
          count: windowUrls.size,
          timestamp: requests[i].timestamp,
          explanation: `IP ${ip} requested ${windowUrls.size} unique URLs within 2 minutes — consistent with automated directory or vulnerability scanning.`,
        });
        break;
      }
    }
  }
  return alerts;
}

export function runHttpDetection(logs: ParsedLog[]): DetectionAlert[] {
  return [...detectHttpBruteForce(logs), ...detectDirectoryScan(logs)];
}
