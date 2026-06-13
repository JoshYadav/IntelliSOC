import type { Alert } from '../types';

const T = {
  bg:           "#080d16",       // page background
  surface:      "#0e1623",       // card / panel surface
  surfaceHover: "#121d2e",       // card hover state
  surfaceDeep:  "#060a10",       // inset / code block backgrounds
  border:       "rgba(255,255,255,0.06)",  // default subtle border
  borderHover:  "rgba(255,255,255,0.11)",  // hover border
  primary:      "#818cf8",       // indigo-400 — primary accent
  primaryDim:   "rgba(129,140,248,0.12)", // primary tint for badges/hover
  critical:     "#fb7185",       // rose-400
  criticalDim:  "rgba(251,113,133,0.12)",
  high:         "#fb923c",       // orange-400
  highDim:      "rgba(251,146,60,0.12)",
  medium:       "#60a5fa",       // blue-400
  mediumDim:    "rgba(96,165,250,0.12)",
  low:          "#34d399",       // emerald-400
  lowDim:       "rgba(52,211,153,0.12)",
  text:         "#f1f5f9",       // primary text — slate-100
  textSecondary:"#94a3b8",       // secondary text — slate-400
  textMuted:    "#475569",       // muted text — slate-600
  dataText:     "#a5b4fc",       // indigo-300, for IP addresses / hashes
};

interface KillChainPhase {
  id: string;
  name: string;
  alertTypes: string[];
}

const KILL_CHAIN: KillChainPhase[] = [
  {
    id: 'recon',
    name: 'Reconnaissance',
    alertTypes: ['PORT_SCAN', 'DIRECTORY_SCAN', 'MULTIPLE_USERS', 'DNS_BEACONING'],
  },
  {
    id: 'initial',
    name: 'Initial Access',
    alertTypes: ['BRUTE_FORCE', 'HTTP_BRUTE_FORCE', 'WINDOWS_BRUTE_FORCE', 'ACCOUNT_COMPROMISE'],
  },
  {
    id: 'execution',
    name: 'Execution',
    alertTypes: ['MALWARE_PROCESS_CHAIN', 'SUSPICIOUS_POWERSHELL', 'LOLBIN_ABUSE'],
  },
  {
    id: 'persistence',
    name: 'Persistence',
    alertTypes: ['PERSISTENCE_DETECTED', 'PERSISTENCE_RUN_KEY', 'SCHEDULED_TASK_PERSIST'],
  },
  {
    id: 'privilege',
    name: 'Privilege Escalation',
    alertTypes: ['SUDO_ABUSE', 'CREDENTIAL_DUMPING'],
  },
  {
    id: 'lateral',
    name: 'Lateral Movement',
    alertTypes: ['LATERAL_MOVEMENT', 'LATERAL_MOVEMENT_PSEXEC', 'SUSPICIOUS_NETWORK'],
  },
  {
    id: 'impact',
    name: 'Impact',
    alertTypes: ['RANSOMWARE_BEHAVIOUR'],
  },
];

interface KillChainTimelineProps {
  alerts: Alert[];
}

const getSeverityColor = (sev: string) => {
  switch (sev?.toUpperCase()) {
    case 'CRITICAL': return T.critical;
    case 'HIGH': return T.high;
    case 'MEDIUM': return T.medium;
    case 'LOW':
    default: return T.low;
  }
};



export default function KillChainTimeline({ alerts }: KillChainTimelineProps) {
  // Count alerts per kill chain phase
  const phaseCounts: Record<string, { count: number; alerts: Alert[] }> = {};
  for (const phase of KILL_CHAIN) {
    phaseCounts[phase.id] = { count: 0, alerts: [] };
  }

  for (const alert of alerts) {
    for (const phase of KILL_CHAIN) {
      if (phase.alertTypes.includes(alert.type)) {
        phaseCounts[phase.id].count += alert.count;
        phaseCounts[phase.id].alerts.push(alert);
        break;
      }
    }
  }

  const totalAlerts = Object.values(phaseCounts).reduce((s, p) => s + p.count, 0);

  if (totalAlerts === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: T.textSecondary }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)' }}>
          No MITRE ATT&CK kill chain activity mapped in current metrics.
        </p>
      </div>
    );
  }

  // Sort alerts chronologically
  const sortedAlerts = [...alerts].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const getCardBorderColor = (tactic: string): string => {
    if (!tactic) return '#06b6d4';
    if (tactic.includes('Lateral')) return '#3b82f6';
    if (tactic.includes('Privilege')) return '#f43f5e';
    if (tactic.includes('Persistence')) return '#f97316';
    if (tactic.includes('Execution')) return '#a855f7';
    if (tactic.includes('Defense')) return '#eab308';
    if (tactic.includes('Command')) return '#06b6d4';
    return '#06b6d4';
  };

  const getTacticTextColor = (tactic: string): string => {
    if (!tactic) return '#06b6d4';
    if (tactic.includes('Lateral')) return '#3b82f6';
    if (tactic.includes('Privilege')) return '#f43f5e';
    if (tactic.includes('Persistence')) return '#f97316';
    if (tactic.includes('Execution')) return '#a855f7';
    if (tactic.includes('Defense')) return '#eab308';
    return '#06b6d4';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem', animation: 'fadeUp 0.4s ease both' }}>
      
      {/* Horizontal timeline stages */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '1rem',
        alignItems: 'stretch',
        overflowX: 'auto',
        paddingBottom: '0.5rem',
      }}>
        {KILL_CHAIN.map((phase) => {
          const data = phaseCounts[phase.id];
          const hasAlerts = data.count > 0;
          const topAlert = hasAlerts ? [...new Set(data.alerts.map(a => a.type))][0] : null;

          return (
            <div
              key={phase.id}
              style={{
                ...(hasAlerts ? {
                  background: 'linear-gradient(135deg, rgba(251,146,60,0.08) 0%, rgba(13,21,38,0.9) 100%)',
                  border: '1px solid rgba(251,146,60,0.25)',
                  borderRadius: '10px',
                  boxShadow: '0 0 16px rgba(251,146,60,0.08)'
                } : {
                  background: 'linear-gradient(135deg, #0d1526 0%, #0a0f1e 100%)',
                  border: '1px solid rgba(6,182,212,0.08)',
                  borderRadius: '10px'
                }),
                padding: '20px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.2s ease',
                gap: '12px',
              }}
            >
              {/* Phase name */}
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '14px',
                fontWeight: 600,
                color: T.textSecondary,
                lineHeight: 1.2,
              }}>
                {phase.name}
              </div>

              {/* Count */}
              <div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '28px',
                  fontWeight: 700,
                  color: hasAlerts ? T.high : T.textMuted,
                  lineHeight: 1.1,
                }}>
                  {data.count}
                </div>
              </div>

              {/* Top alert type */}
              <div>
                {topAlert ? (
                  <span style={{
                    fontSize: '12px',
                    color: T.textMuted,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 500,
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}>
                    {topAlert.replace(/_/g, ' ').charAt(0).toUpperCase() + topAlert.replace(/_/g, ' ').slice(1).toLowerCase()}
                  </span>
                ) : (
                  <span style={{
                    fontSize: '12px',
                    color: T.textMuted,
                    fontFamily: 'var(--font-display)',
                    fontWeight: 500,
                    display: 'block',
                  }}>
                    —
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chronological Attack Timeline */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', borderLeft: `4px solid ${T.primary}`, paddingLeft: '12px' }}>
          <h4 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, fontFamily: 'var(--font-display)', color: T.text, margin: 0 }}>
            Chronological attack progression
          </h4>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sortedAlerts.map((alert) => {
            const phase = KILL_CHAIN.find(p => p.alertTypes.includes(alert.type)) || {
              name: 'Infiltration',
            };
            
            const timestamp = new Date(alert.timestamp);
            const timeStr = timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
            const dateStr = timestamp.toLocaleDateString();

            return (
              <div
                key={alert.id}
                style={{
                  background: 'linear-gradient(135deg, #0d1526 0%, #0a1020 100%)',
                  border: '1px solid rgba(6,182,212,0.12)',
                  borderLeft: `4px solid ${getCardBorderColor(phase.name)}`,
                  borderRadius: '8px',
                  padding: '14px 16px',
                  marginBottom: '10px',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', 
                              alignItems: 'flex-start', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600', 
                                   color: '#e2e8f0', textTransform: 'capitalize' }}>
                      {alert.type.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    <span style={{ fontSize: '11px', fontWeight: '500',
                                   color: getTacticTextColor(phase.name) }}>
                      {phase.name}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
                    <span style={{ fontSize: '11px', color: '#475569' }}>
                      {dateStr} • {timeStr}
                    </span>
                    <div style={{ fontSize: '11px', fontFamily: 'monospace', 
                                  color: '#f97316', fontWeight: '600', marginTop: '2px' }}>
                      Risk: {alert.riskScore}/100
                    </div>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6',
                            wordBreak: 'break-all', overflowWrap: 'anywhere' }}>
                  {alert.explanation || 'Suspicious network action detected.'}
                </p>
                {alert.ip && (
                  <p style={{ fontSize: '11px', fontFamily: 'monospace', 
                              color: '#475569', marginTop: '8px' }}>
                    src_ip: <span style={{ color: '#06b6d4' }}>{alert.ip}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
