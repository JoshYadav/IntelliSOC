// Shared types for IntelliSOC

// ── Log format ────────────────────────────────────────────────────────────────
export type LogFormat =
  | 'SSH_AUTH'
  | 'APACHE'
  | 'NGINX'
  | 'WINDOWS_EVENT'
  | 'SYSMON'
  | 'FIREWALL'
  | 'UNKNOWN';

// ── Event types (one per raw log line) ───────────────────────────────────────
export type EventType =
  // SSH / Linux Auth
  | 'LOGIN_FAILED'
  | 'LOGIN_SUCCESS'
  | 'SUDO_COMMAND'
  | 'SU_ATTEMPT'
  // HTTP
  | 'HTTP_REQUEST'
  // Windows Security
  | 'WIN_LOGON_SUCCESS'     // 4624
  | 'WIN_LOGON_FAILED'      // 4625
  | 'WIN_EXPLICIT_CRED'     // 4648
  | 'WIN_AUDIT_CHANGE'      // 4719
  | 'WIN_ACCOUNT_CREATED'   // 4720
  | 'WIN_ACCOUNT_DELETED'   // 4726
  | 'WIN_OTHER'
  // Sysmon
  | 'SYSMON_PROCESS_CREATE' // 1
  | 'SYSMON_NETWORK_CONNECT'// 3
  | 'SYSMON_FILE_CREATE'    // 11
  | 'SYSMON_OTHER'
  // Firewall
  | 'FW_ALLOW'
  | 'FW_DENY'
  // Fallback
  | 'UNKNOWN';

// ── Alert types (one per detection rule hit) ──────────────────────────────────
export type AlertType =
  // SSH / Linux
  | 'BRUTE_FORCE'
  | 'MULTIPLE_USERS'
  | 'ACCOUNT_COMPROMISE'
  | 'SUDO_ABUSE'
  | 'HONEYPOT_TARGET'
  // HTTP
  | 'HTTP_BRUTE_FORCE'
  | 'DIRECTORY_SCAN'
  // Windows
  | 'WINDOWS_BRUTE_FORCE'
  | 'PERSISTENCE_DETECTED'
  | 'LATERAL_MOVEMENT'
  // Sysmon
  | 'MALWARE_PROCESS_CHAIN'
  | 'SUSPICIOUS_NETWORK'
  // Firewall
  | 'PORT_SCAN'
  // EDR
  | 'LOLBIN_ABUSE'
  | 'PERSISTENCE_RUN_KEY'
  | 'SCHEDULED_TASK_PERSIST'
  | 'CREDENTIAL_DUMPING'
  | 'RANSOMWARE_BEHAVIOUR'
  | 'LATERAL_MOVEMENT_PSEXEC'
  | 'SUSPICIOUS_POWERSHELL'
  | 'DNS_BEACONING';

// ── Parsed log entry (universal flat structure) ───────────────────────────────
export interface ParsedLog {
  timestamp: Date;
  format: LogFormat;
  eventType: EventType;
  rawLog: string;

  // Common auth fields
  ip?: string;
  user?: string;

  // HTTP (Apache / Nginx)
  method?: string;
  url?: string;
  statusCode?: number;
  responseSize?: number;
  userAgent?: string;

  // Windows Event Log
  eventId?: number;
  computer?: string;
  logonType?: number;

  // Sysmon
  processGuid?: string;
  image?: string;
  commandLine?: string;
  parentImage?: string;
  destinationIp?: string;
  destinationPort?: number;
  targetFilename?: string;

  // Firewall
  srcIp?: string;
  dstIp?: string;
  dstPort?: number;
  action?: string;
  protocol?: string;

  // Linux extras
  sudoCommand?: string;
  pid?: string;
}

// ── Detection alert ───────────────────────────────────────────────────────────
export interface DetectionAlert {
  type: AlertType;
  ip: string;
  user?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  mitreTactic?: string;
  explanation?: string;
  reputation?: string;
  // AbuseIPDB enrichment
  abuseScore?: number;
  country?: string | null;
  isp?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  count: number;
  timestamp: Date;
}

// ── Analytics response ────────────────────────────────────────────────────────
export interface AnalyticsData {
  totalAlerts: number;
  totalLogs: number;
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  topIPs: { ip: string; count: number }[];
  riskDistribution: { label: string; value: number }[];
}
