// Shared types for IntelliSOC

export interface ParsedLog {
  timestamp: Date;
  eventType: 'LOGIN_FAILED' | 'LOGIN_SUCCESS' | 'UNKNOWN';
  user: string;
  ip: string;
  rawLog: string;
  pid?: string;
}

export interface DetectionAlert {
  type: 'BRUTE_FORCE' | 'MULTIPLE_USERS' | 'ACCOUNT_COMPROMISE';
  ip: string;
  user?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskScore: number;
  mitreTactic?: string;
  explanation?: string;
  reputation?: string;
  count: number;
  timestamp: Date;
}

export interface AnalyticsData {
  totalAlerts: number;
  totalLogs: number;
  alertsByType: Record<string, number>;
  alertsBySeverity: Record<string, number>;
  topIPs: { ip: string; count: number }[];
  riskDistribution: { label: string; value: number }[];
}
