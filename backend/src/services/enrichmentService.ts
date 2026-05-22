import { DetectionAlert, AlertType } from '../utils/types';

// ── MITRE ATT&CK mappings (all 11 alert types) ───────────────────────────────
const MITRE_MAPPINGS: Record<AlertType, { tactic: string; technique: string }> = {
  // SSH / Linux
  BRUTE_FORCE:           { tactic: 'Credential Access',    technique: 'T1110 - Brute Force' },
  MULTIPLE_USERS:        { tactic: 'Credential Access',    technique: 'T1110.001 - Password Guessing' },
  ACCOUNT_COMPROMISE:    { tactic: 'Initial Access',       technique: 'T1078 - Valid Accounts' },
  SUDO_ABUSE:            { tactic: 'Privilege Escalation', technique: 'T1548.003 - Sudo and Sudo Caching' },
  // HTTP
  HTTP_BRUTE_FORCE:      { tactic: 'Credential Access',    technique: 'T1110.001 - Brute Force: Password Guessing' },
  DIRECTORY_SCAN:        { tactic: 'Discovery',            technique: 'T1083 - File and Directory Discovery' },
  // Windows
  WINDOWS_BRUTE_FORCE:   { tactic: 'Credential Access',    technique: 'T1110 - Brute Force' },
  PERSISTENCE_DETECTED:  { tactic: 'Persistence',          technique: 'T1136.001 - Create Account: Local Account' },
  LATERAL_MOVEMENT:      { tactic: 'Lateral Movement',     technique: 'T1021 - Remote Services / T1550.002 - Pass the Hash' },
  // Sysmon
  MALWARE_PROCESS_CHAIN: { tactic: 'Execution',            technique: 'T1204.002 - User Execution: Malicious File' },
  SUSPICIOUS_NETWORK:    { tactic: 'Command and Control',  technique: 'T1071 - Application Layer Protocol' },
  // Firewall
  PORT_SCAN:             { tactic: 'Discovery',            technique: 'T1046 - Network Service Discovery' },
};

// ── Explanation templates (fallback for types without inline explanations) ────
const EXPLANATIONS: Partial<Record<AlertType, (a: DetectionAlert) => string>> = {
  BRUTE_FORCE: (a) =>
    `IP ${a.ip} attempted ${a.count} failed logins for user "${a.user}" within a short time window. Classic brute force attack targeting SSH credentials.`,
  MULTIPLE_USERS: (a) =>
    `IP ${a.ip} attempted logins for ${a.count} different user accounts (${a.user}). Indicates credential stuffing or user enumeration.`,
  ACCOUNT_COMPROMISE: (a) =>
    a.explanation ?? `Account "${a.user}" was compromised from IP ${a.ip} after multiple failed attempts.`,
};

// ── AbuseIPDB v2 lookup ───────────────────────────────────────────────────────
interface IPEnrichment {
  reputation: string;
  abuseScore: number;
  country: string | null;
  isp: string | null;
}

const PRIVATE_IP = /^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|127\.|0\.0\.0\.0$|LOCAL$|UNKNOWN$)/;

function scoreToReputation(score: number): string {
  if (score >= 75) return 'MALICIOUS';
  if (score >= 26) return 'SUSPICIOUS';
  return 'UNKNOWN';
}

async function lookupIP(ip: string): Promise<IPEnrichment> {
  const fallback: IPEnrichment = { reputation: 'UNKNOWN', abuseScore: 0, country: null, isp: null };

  // Skip private / non-routable addresses
  if (PRIVATE_IP.test(ip)) return fallback;

  const apiKey = process.env.ABUSEIPDB_API_KEY;
  if (!apiKey) {
    console.warn('[AbuseIPDB] ABUSEIPDB_API_KEY not set — skipping lookup.');
    return fallback;
  }

  try {
    const url = `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Key: apiKey, Accept: 'application/json' },
    });

    if (!response.ok) {
      console.warn(`[AbuseIPDB] HTTP ${response.status} for IP ${ip}`);
      return fallback;
    }

    const json = (await response.json()) as {
      data: { abuseConfidenceScore: number; countryCode: string | null; isp: string | null };
    };
    const score = json.data.abuseConfidenceScore ?? 0;
    return {
      reputation: scoreToReputation(score),
      abuseScore: score,
      country: json.data.countryCode ?? null,
      isp: json.data.isp ?? null,
    };
  } catch (err) {
    console.warn(`[AbuseIPDB] Network error for IP ${ip}:`, err);
    return fallback;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
export async function enrichAlerts(alerts: DetectionAlert[]): Promise<DetectionAlert[]> {
  // Deduplicate IPs (skip non-routable ones to save quota)
  const uniqueIPs = [...new Set(alerts.map((a) => a.ip).filter((ip) => !PRIVATE_IP.test(ip)))];

  // Fan-out API calls in parallel
  const results = await Promise.all(uniqueIPs.map((ip) => lookupIP(ip)));
  const ipEnrichment = new Map<string, IPEnrichment>();
  uniqueIPs.forEach((ip, i) => ipEnrichment.set(ip, results[i]));

  return alerts.map((alert) => {
    const mitreInfo    = MITRE_MAPPINGS[alert.type];
    const explanationFn = EXPLANATIONS[alert.type];
    const enrichment   = ipEnrichment.get(alert.ip) ?? { reputation: 'UNKNOWN', abuseScore: 0, country: null, isp: null };

    return {
      ...alert,
      mitreTactic:  mitreInfo ? `${mitreInfo.tactic} | ${mitreInfo.technique}` : undefined,
      explanation:  explanationFn ? explanationFn(alert) : alert.explanation,
      reputation:   enrichment.reputation,
      abuseScore:   enrichment.abuseScore,
      country:      enrichment.country,
      isp:          enrichment.isp,
    };
  });
}
