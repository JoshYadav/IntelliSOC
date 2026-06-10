// Shared frontend types

export type LogFormat =
  | 'SSH_AUTH'
  | 'APACHE'
  | 'NGINX'
  | 'WINDOWS_EVENT'
  | 'SYSMON'
  | 'FIREWALL'
  | 'UNKNOWN';

export type AlertType =
  | 'BRUTE_FORCE'
  | 'MULTIPLE_USERS'
  | 'ACCOUNT_COMPROMISE'
  | 'SUDO_ABUSE'
  | 'HONEYPOT_TARGET';

export interface Session {
  id: string;
  fileName: string;
  logFormat: LogFormat;
  createdAt: string;
  incidentId?: string | null;
  _count?: {
    logs: number;
    alerts: number;
  };
}

export interface Alert {
  id: number;
  sessionId: string;
  type: string;
  ip: string;
  user: string | null;
  severity: string;
  riskScore: number;
  mitreTactic: string | null;
  explanation: string | null;
  reputation: string | null;
  count: number;
  timestamp: string;
  status: string; // NEW | ACKNOWLEDGED | FALSE_POSITIVE | ESCALATED | RESOLVED
  // AbuseIPDB enrichment
  abuseScore: number | null;
  country: string | null;
  isp: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface UploadResponse {
  message: string;
  sessionId: string;
  logFormat: LogFormat;
  logsProcessed: number;
  alertsGenerated: number;
  incidentsCreated?: number;
  incidentId?: string | null;
}

export interface AnalyticsData {
  totalAlerts: number;
  totalLogs: number;
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  topIPs: { ip: string; count: number }[];
  riskDistribution: { label: string; value: number }[];
}

// ── SOAR Types ────────────────────────────────────────────────────────────────

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  status: string; // OPEN | IN_PROGRESS | RESOLVED | FALSE_POSITIVE
  priority: string; // LOW | MEDIUM | HIGH | CRITICAL
  assignee: string | null;
  aiSummary: string | null;
  createdAt: string;
  updatedAt: string;
  alerts?: IncidentAlert[];
  timeline?: IncidentEvent[];
  playbookRuns?: PlaybookRun[];
  _count?: {
    alerts: number;
    timeline: number;
    playbookRuns: number;
  };
}

export interface IncidentAlert {
  incidentId: string;
  alertId: number;
  alert: Alert;
}

export interface IncidentEvent {
  id: number;
  incidentId: string;
  type: string; // NOTE | STATUS_CHANGE | PLAYBOOK_RUN | ALERT_ADDED | ACTION_APPROVED
  content: string;
  author: string;
  createdAt: string;
}

export interface Playbook {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  steps: string; // JSON string of PlaybookStep[]
  enabled: boolean;
  createdAt: string;
  runs?: PlaybookRun[];
  _count?: {
    runs: number;
  };
}

export interface PlaybookStep {
  index: number;
  type: string;
  label: string;
  config?: Record<string, unknown>;
  requiresApproval?: boolean;
}

export interface PlaybookRun {
  id: string;
  playbookId: string;
  incidentId: string | null;
  status: string; // RUNNING | SUCCESS | FAILED | SKIPPED
  stepResults: string | null; // JSON string of StepResult[]
  startedAt: string;
  finishedAt: string | null;
  playbook?: Playbook;
}

export interface StepResult {
  stepIndex: number;
  type: string;
  status: 'SUCCESS' | 'FAILED' | 'PENDING_APPROVAL' | 'SKIPPED';
  output: string;
}

// ── EDR Types ─────────────────────────────────────────────────────────────────

export interface Endpoint {
  id: string;
  hostname: string;
  ip: string | null;
  os: string | null;
  agentVersion: string | null;
  status: 'ONLINE' | 'OFFLINE' | 'ISOLATED';
  lastSeen: string;
  createdAt: string;
  alertCount?: number;
  _count?: {
    telemetry: number;
  };
}

export interface EndpointTelemetry {
  id: number;
  endpointId: string;
  type: 'PROCESS' | 'NETWORK' | 'FILE' | 'SYSTEM_INFO';
  data: any; // Parsed JSON payload
  timestamp: string;
}

export interface ProcessEntry {
  pid: number;
  name: string;
  parentPid?: number;
  path?: string;
  cpu?: number;
  memory?: number;
  commandLine?: string;
}

export interface NetworkEntry {
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  state: string;
  pid?: number;
  protocol?: string;
}

export interface FileEntry {
  path: string;
  size?: number;
  modifiedTime?: string;
  operation: 'CREATE' | 'MODIFY' | 'DELETE' | 'RENAME';
}

export interface CorrelationData {
  ip: string;
  alertCount: number;
  sessionCount: number;
  sessionNames: string[];
  maxRiskScore: number;
  severities: Record<string, number>;
  lastSeen: string;
}



