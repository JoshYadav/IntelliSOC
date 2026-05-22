import { ParsedLog, DetectionAlert } from '../utils/types';

// Office / document apps that should never spawn shells
const OFFICE_PARENTS = /\\(winword|excel|powerpnt|outlook|onenote|msaccess|acrord32|foxit|evince)\.exe$/i;

// Suspicious child processes
const SHELL_IMAGES = /\\(cmd|powershell|pwsh|wscript|cscript|mshta|rundll32|regsvr32|certutil|bitsadmin|msiexec)\.exe$/i;

// Private / loopback IP ranges — connections TO these are not suspicious
const PRIVATE_IP = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|::1$|fc00:|fe80:)/;

// ── Malware Process Chain ─────────────────────────────────────────────────────
// EventID 1: Office app (parentImage) → shell (image)
function detectMalwareProcessChain(logs: ParsedLog[]): DetectionAlert[] {
  const alerts: DetectionAlert[] = [];

  for (const log of logs) {
    if (
      log.eventType === 'SYSMON_PROCESS_CREATE' &&
      log.parentImage &&
      log.image &&
      OFFICE_PARENTS.test(log.parentImage) &&
      SHELL_IMAGES.test(log.image)
    ) {
      const parent = log.parentImage.split('\\').pop() ?? log.parentImage;
      const child  = log.image.split('\\').pop() ?? log.image;
      const key    = `${log.computer}::${log.parentImage}::${log.image}`;

      if (!alerts.some((a) => a.type === 'MALWARE_PROCESS_CHAIN' && a.explanation?.includes(key))) {
        alerts.push({
          type: 'MALWARE_PROCESS_CHAIN',
          ip: log.computer ?? 'LOCAL',
          user: log.user,
          severity: 'CRITICAL',
          riskScore: 92,
          count: 1,
          timestamp: log.timestamp,
          explanation: `[${key}] Suspicious process chain on ${log.computer}: "${parent}" spawned "${child}"${log.commandLine ? ` with command: ${log.commandLine.slice(0, 120)}` : ''}. This pattern is characteristic of macro-based malware execution.`,
        });
      }
    }
  }
  return alerts;
}

// ── Suspicious Outbound Network Connection ────────────────────────────────────
// EventID 3: Office/shell process connecting to external IP
function detectSuspiciousNetwork(logs: ParsedLog[]): DetectionAlert[] {
  const alerts: DetectionAlert[] = [];
  const seen = new Set<string>();

  for (const log of logs) {
    if (
      log.eventType === 'SYSMON_NETWORK_CONNECT' &&
      log.image &&
      log.destinationIp &&
      !PRIVATE_IP.test(log.destinationIp) &&
      (OFFICE_PARENTS.test(log.image) || SHELL_IMAGES.test(log.image))
    ) {
      const proc = log.image.split('\\').pop() ?? log.image;
      const key  = `${log.computer}::${log.image}::${log.destinationIp}`;
      if (!seen.has(key)) {
        seen.add(key);
        alerts.push({
          type: 'SUSPICIOUS_NETWORK',
          ip: log.destinationIp,
          user: log.user,
          severity: 'HIGH',
          riskScore: 80,
          count: 1,
          timestamp: log.timestamp,
          explanation: `Process "${proc}" on ${log.computer ?? 'LOCAL'} initiated an outbound connection to external IP ${log.destinationIp}:${log.destinationPort ?? '?'}. Unusual for this process type — potential C2 beaconing.`,
        });
      }
    }
  }
  return alerts;
}

export function runSysmonDetection(logs: ParsedLog[]): DetectionAlert[] {
  return [...detectMalwareProcessChain(logs), ...detectSuspiciousNetwork(logs)];
}
