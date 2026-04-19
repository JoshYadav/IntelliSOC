// Shared frontend types

export interface Session {
  id: string;
  fileName: string;
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
}

export interface UploadResponse {
  message: string;
  sessionId: string;
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
