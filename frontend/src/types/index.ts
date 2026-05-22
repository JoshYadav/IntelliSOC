// Shared frontend types

export type LogFormat =
  | 'SSH_AUTH'
  | 'APACHE'
  | 'NGINX'
  | 'WINDOWS_EVENT'
  | 'SYSMON'
  | 'FIREWALL'
  | 'UNKNOWN';

export interface Session {
  id: string;
  fileName: string;
  logFormat: LogFormat;
  createdAt: string;
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
  // AbuseIPDB enrichment
  abuseScore: number | null;
  country: string | null;
  isp: string | null;
}

export interface UploadResponse {
  message: string;
  sessionId: string;
  logFormat: LogFormat;
  logsProcessed: number;
  alertsGenerated: number;
}

export interface AnalyticsData {
  totalAlerts: number;
  totalLogs: number;
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  topIPs: { ip: string; count: number }[];
  riskDistribution: { label: string; value: number }[];
}
