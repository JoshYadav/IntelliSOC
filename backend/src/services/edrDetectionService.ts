import prisma from '../utils/prisma';
import type { AlertType } from '../utils/types';

// ── Types for telemetry payloads ─────────────────────────────────────────────

interface ProcessEntry {
  pid: number;
  name: string;
  parentPid?: number;
  path?: string;
  cpu?: number;
  memory?: number;
  commandLine?: string;
}

interface NetworkEntry {
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  state: string;
  pid?: number;
  protocol?: string;
}

interface FileEntry {
  path: string;
  size?: number;
  modifiedTime?: string;
  operation: string; // CREATE | MODIFY | DELETE | RENAME
}

interface EdrAlert {
  type: AlertType;
  hostname: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  mitreTactic: string;
  explanation: string;
  count: number;
}

// ── LoLBin (Living-off-the-Land Binary) Abuse ────────────────────────────────
// Detects: certutil, bitsadmin, mshta, regsvr32 used for downloads
// MITRE: T1218
const LOLBIN_PATTERNS = [
  /certutil\b.*(-urlcache|-split)/i,
  /bitsadmin\b.*\/transfer/i,
  /mshta\b.*(http|vbscript|javascript)/i,
  /regsvr32\b.*\/s.*\/i.*(http|scrobj)/i,
  /rundll32\b.*javascript/i,
  /cscript\b.*http/i,
  /wscript\b.*http/i,
];

function detectLolbinAbuse(processes: ProcessEntry[], hostname: string): EdrAlert[] {
  const alerts: EdrAlert[] = [];
  for (const proc of processes) {
    const cmd = proc.commandLine || proc.path || proc.name || '';
    for (const pattern of LOLBIN_PATTERNS) {
      if (pattern.test(cmd)) {
        alerts.push({
          type: 'LOLBIN_ABUSE',
          hostname,
          severity: 'HIGH',
          riskScore: 75,
          mitreTactic: 'T1218 — System Binary Proxy Execution',
          explanation: `LoLBin abuse detected: process "${proc.name}" (PID ${proc.pid}) executed suspicious command: ${cmd.substring(0, 200)}`,
          count: 1,
        });
        break;
      }
    }
  }
  return alerts;
}

// ── Persistence via Run Keys ─────────────────────────────────────────────────
// Detects: Registry writes to ...\CurrentVersion\Run
// MITRE: T1547.001
const RUN_KEY_PATTERNS = [
  /HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run/i,
  /HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run/i,
  /reg\s+add\b.*\\CurrentVersion\\Run/i,
];

function detectPersistenceRunKey(processes: ProcessEntry[], hostname: string): EdrAlert[] {
  const alerts: EdrAlert[] = [];
  for (const proc of processes) {
    const cmd = proc.commandLine || '';
    for (const pattern of RUN_KEY_PATTERNS) {
      if (pattern.test(cmd)) {
        alerts.push({
          type: 'PERSISTENCE_RUN_KEY',
          hostname,
          severity: 'HIGH',
          riskScore: 80,
          mitreTactic: 'T1547.001 — Boot or Logon Autostart Execution: Registry Run Keys',
          explanation: `Persistence mechanism detected: process "${proc.name}" (PID ${proc.pid}) is writing to startup registry Run key: ${cmd.substring(0, 200)}`,
          count: 1,
        });
        break;
      }
    }
  }
  return alerts;
}

// ── Scheduled Task Creation ──────────────────────────────────────────────────
// Detects: schtasks /create
// MITRE: T1053.005
function detectScheduledTask(processes: ProcessEntry[], hostname: string): EdrAlert[] {
  const alerts: EdrAlert[] = [];
  for (const proc of processes) {
    const cmd = proc.commandLine || '';
    if (/schtasks\b.*\/create/i.test(cmd)) {
      alerts.push({
        type: 'SCHEDULED_TASK_PERSIST',
        hostname,
        severity: 'HIGH',
        riskScore: 70,
        mitreTactic: 'T1053.005 — Scheduled Task/Job: Scheduled Task',
        explanation: `Scheduled task creation detected: process "${proc.name}" (PID ${proc.pid}) ran: ${cmd.substring(0, 200)}`,
        count: 1,
      });
    }
  }
  return alerts;
}

// ── Credential Dumping ───────────────────────────────────────────────────────
// Detects: LSASS access, procdump, mimikatz
// MITRE: T1003.001
const CRED_DUMP_NAMES = ['mimikatz', 'procdump', 'sekurlsa', 'lsass'];
const CRED_DUMP_PATTERNS = [
  /mimikatz/i,
  /procdump\b.*-ma\s+lsass/i,
  /sekurlsa::logonpasswords/i,
  /comsvcs\.dll.*MiniDump/i,
];

function detectCredentialDumping(processes: ProcessEntry[], hostname: string): EdrAlert[] {
  const alerts: EdrAlert[] = [];
  for (const proc of processes) {
    const name = (proc.name || '').toLowerCase();
    const cmd = proc.commandLine || '';

    // Check process name
    if (CRED_DUMP_NAMES.some((n) => name.includes(n))) {
      alerts.push({
        type: 'CREDENTIAL_DUMPING',
        hostname,
        severity: 'CRITICAL',
        riskScore: 95,
        mitreTactic: 'T1003.001 — OS Credential Dumping: LSASS Memory',
        explanation: `Credential dumping tool detected: "${proc.name}" (PID ${proc.pid}) — this binary is commonly used to extract passwords from memory.`,
        count: 1,
      });
      continue;
    }

    // Check command line
    for (const pattern of CRED_DUMP_PATTERNS) {
      if (pattern.test(cmd)) {
        alerts.push({
          type: 'CREDENTIAL_DUMPING',
          hostname,
          severity: 'CRITICAL',
          riskScore: 95,
          mitreTactic: 'T1003.001 — OS Credential Dumping: LSASS Memory',
          explanation: `Credential dumping command detected: "${proc.name}" (PID ${proc.pid}) ran: ${cmd.substring(0, 200)}`,
          count: 1,
        });
        break;
      }
    }
  }
  return alerts;
}

// ── Ransomware Behaviour ─────────────────────────────────────────────────────
// Detects: >50 file renames/deletions within a single telemetry batch (60s window)
// MITRE: T1486
const RANSOMWARE_THRESHOLD = 50;

function detectRansomware(files: FileEntry[], hostname: string): EdrAlert[] {
  const destructiveOps = files.filter(
    (f) => f.operation === 'RENAME' || f.operation === 'DELETE'
  );

  if (destructiveOps.length >= RANSOMWARE_THRESHOLD) {
    return [
      {
        type: 'RANSOMWARE_BEHAVIOUR',
        hostname,
        severity: 'CRITICAL',
        riskScore: 99,
        mitreTactic: 'T1486 — Data Encrypted for Impact',
        explanation: `Ransomware-like behaviour detected: ${destructiveOps.length} file ${destructiveOps[0].operation.toLowerCase()}s observed within 60 seconds. Sample paths: ${destructiveOps
          .slice(0, 5)
          .map((f) => f.path)
          .join(', ')}`,
        count: destructiveOps.length,
      },
    ];
  }
  return [];
}

// ── Lateral Movement via PsExec ──────────────────────────────────────────────
// Detects: PSEXESVC.exe or psexec in process list
// MITRE: T1021.002
function detectLateralMovement(processes: ProcessEntry[], hostname: string): EdrAlert[] {
  const alerts: EdrAlert[] = [];
  for (const proc of processes) {
    const name = (proc.name || '').toLowerCase();
    if (name.includes('psexesvc') || name.includes('psexec')) {
      alerts.push({
        type: 'LATERAL_MOVEMENT_PSEXEC',
        hostname,
        severity: 'HIGH',
        riskScore: 80,
        mitreTactic: 'T1021.002 — Remote Services: SMB/Windows Admin Shares',
        explanation: `PsExec lateral movement detected: "${proc.name}" (PID ${proc.pid}) is running — this indicates remote command execution from another machine.`,
        count: 1,
      });
    }
  }
  return alerts;
}

// ── Suspicious PowerShell ────────────────────────────────────────────────────
// Detects: -EncodedCommand, -WindowStyle Hidden, IEX, DownloadString
// MITRE: T1059.001
const PS_SUSPICIOUS_PATTERNS = [
  /-EncodedCommand/i,
  /-WindowStyle\s+Hidden/i,
  /\bIEX\b/i,
  /Invoke-Expression/i,
  /DownloadString/i,
  /DownloadFile/i,
  /Net\.WebClient/i,
  /\bbypass\b.*executionpolicy/i,
  /executionpolicy.*\bbypass\b/i,
];

function detectSuspiciousPowershell(processes: ProcessEntry[], hostname: string): EdrAlert[] {
  const alerts: EdrAlert[] = [];
  for (const proc of processes) {
    const name = (proc.name || '').toLowerCase();
    if (!name.includes('powershell') && !name.includes('pwsh')) continue;

    const cmd = proc.commandLine || '';
    for (const pattern of PS_SUSPICIOUS_PATTERNS) {
      if (pattern.test(cmd)) {
        alerts.push({
          type: 'SUSPICIOUS_POWERSHELL',
          hostname,
          severity: 'HIGH',
          riskScore: 70,
          mitreTactic: 'T1059.001 — Command and Scripting Interpreter: PowerShell',
          explanation: `Suspicious PowerShell detected: PID ${proc.pid} ran: ${cmd.substring(0, 250)}`,
          count: 1,
        });
        break; // one alert per process
      }
    }
  }
  return alerts;
}

// ── DNS Beaconing ────────────────────────────────────────────────────────────
// Detects: same remote address contacted >20 times (indicates C2 beaconing)
// MITRE: T1071.004
const BEACON_THRESHOLD = 20;

function detectDnsBeaconing(network: NetworkEntry[], hostname: string): EdrAlert[] {
  const remoteCounts = new Map<string, number>();

  for (const conn of network) {
    if (conn.remoteAddress && conn.remoteAddress !== '0.0.0.0' && conn.remoteAddress !== '::' && conn.remoteAddress !== '127.0.0.1') {
      remoteCounts.set(conn.remoteAddress, (remoteCounts.get(conn.remoteAddress) || 0) + 1);
    }
  }

  const alerts: EdrAlert[] = [];
  for (const [addr, count] of remoteCounts) {
    if (count >= BEACON_THRESHOLD) {
      alerts.push({
        type: 'DNS_BEACONING',
        hostname,
        severity: 'MEDIUM',
        riskScore: 55,
        mitreTactic: 'T1071.004 — Application Layer Protocol: DNS',
        explanation: `Potential C2 beaconing detected: ${count} connections to ${addr} within 60 seconds — regular-interval callbacks to the same host suggest command-and-control communication.`,
        count,
      });
    }
  }
  return alerts;
}

// ── Main detection entry point ───────────────────────────────────────────────
export async function runEdrDetection(
  hostname: string,
  type: string,
  data: unknown[],
  saveToDb: boolean = true
): Promise<EdrAlert[]> {
  let alerts: EdrAlert[] = [];

  if (type === 'PROCESS') {
    const processes = data as ProcessEntry[];
    alerts = [
      ...detectLolbinAbuse(processes, hostname),
      ...detectPersistenceRunKey(processes, hostname),
      ...detectScheduledTask(processes, hostname),
      ...detectCredentialDumping(processes, hostname),
      ...detectLateralMovement(processes, hostname),
      ...detectSuspiciousPowershell(processes, hostname),
    ];
  } else if (type === 'NETWORK') {
    const network = data as NetworkEntry[];
    alerts = [
      ...detectDnsBeaconing(network, hostname),
    ];
  } else if (type === 'FILE') {
    const files = data as FileEntry[];
    alerts = [
      ...detectRansomware(files, hostname),
    ];
  }

  if (alerts.length === 0) return [];

  if (saveToDb) {
    for (const alert of alerts) {
      const recentDuplicate = await prisma.alert.findFirst({
        where: {
          type: alert.type,
          ip: alert.hostname,
          timestamp: { gte: new Date(Date.now() - 10 * 60 * 1000) },
        },
      });

      if (recentDuplicate) continue;

      let session = await prisma.session.findFirst({
        where: {
          fileName: `EDR:${alert.hostname}`,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!session) {
        session = await prisma.session.create({
          data: {
            fileName: `EDR:${alert.hostname}`,
            logFormat: 'UNKNOWN',
          },
        });
      }

      await prisma.alert.create({
        data: {
          sessionId: session.id,
          type: alert.type,
          ip: alert.hostname,
          severity: alert.severity,
          riskScore: alert.riskScore,
          mitreTactic: alert.mitreTactic,
          explanation: alert.explanation,
          count: alert.count,
          timestamp: new Date(),
          status: 'NEW',
        },
      });

      console.log(`[EDR] 🚨 Alert: ${alert.type} on ${alert.hostname} — ${alert.explanation.substring(0, 80)}...`);
    }
  }

  return alerts;
}
