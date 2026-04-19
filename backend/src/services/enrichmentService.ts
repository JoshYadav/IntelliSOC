import { DetectionAlert } from '../utils/types';

// MITRE ATT&CK mappings
const MITRE_MAPPINGS: Record<string, { tactic: string; technique: string }> = {
  BRUTE_FORCE: {
    tactic: 'Credential Access',
    technique: 'T1110 - Brute Force',
  },
  MULTIPLE_USERS: {
    tactic: 'Credential Access',
    technique: 'T1110.001 - Password Guessing',
  },
  ACCOUNT_COMPROMISE: {
    tactic: 'Initial Access',
    technique: 'T1078 - Valid Accounts',
  },
};

// Explanation templates
const EXPLANATIONS: Record<string, (alert: DetectionAlert) => string> = {
  BRUTE_FORCE: (a) =>
    `IP ${a.ip} attempted ${a.count} failed logins for user "${a.user}" within a short time window. This is a classic brute force attack pattern targeting SSH credentials.`,
  MULTIPLE_USERS: (a) =>
    `IP ${a.ip} attempted logins for ${a.count} different user accounts (${a.user}). This indicates credential stuffing or user enumeration activity.`,
  ACCOUNT_COMPROMISE: (a) =>
    a.explanation || `Account "${a.user}" was compromised from IP ${a.ip} after multiple failed attempts.`,
};

/**
 * Calculate IP reputation based on alert activity.
 */
function getIPReputation(alertCount: number, hasCompromise: boolean): string {
  if (hasCompromise) return 'MALICIOUS';
  if (alertCount >= 2) return 'SUSPICIOUS';
  return 'UNKNOWN';
}

/**
 * Enrich alerts with MITRE tactics, explanations, and IP reputation.
 */
export function enrichAlerts(alerts: DetectionAlert[]): DetectionAlert[] {
  // Build IP alert count map for reputation
  const ipAlertCount: Map<string, number> = new Map();
  const ipHasCompromise: Map<string, boolean> = new Map();

  for (const alert of alerts) {
    ipAlertCount.set(alert.ip, (ipAlertCount.get(alert.ip) || 0) + 1);
    if (alert.type === 'ACCOUNT_COMPROMISE') {
      ipHasCompromise.set(alert.ip, true);
    }
  }

  return alerts.map((alert) => {
    const mitreInfo = MITRE_MAPPINGS[alert.type];
    const explanationFn = EXPLANATIONS[alert.type];
    const reputation = getIPReputation(
      ipAlertCount.get(alert.ip) || 0,
      ipHasCompromise.get(alert.ip) || false
    );

    return {
      ...alert,
      mitreTactic: mitreInfo ? `${mitreInfo.tactic} | ${mitreInfo.technique}` : undefined,
      explanation: explanationFn ? explanationFn(alert) : alert.explanation,
      reputation,
    };
  });
}
