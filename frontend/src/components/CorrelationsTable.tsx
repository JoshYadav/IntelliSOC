import type { CorrelationData } from '../types';
import { ShieldAlert, RefreshCw, Loader2, Clock, AlertTriangle, Clipboard } from 'lucide-react';

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).catch(() => {});
  window.dispatchEvent(new CustomEvent('show-toast', { detail: `Copied IP ${text} to clipboard` }));
};

interface CorrelationsTableProps {
  correlations: CorrelationData[];
  isLoading: boolean;
  onRefresh: () => void;
}

const T = {
  bg:           "#080d16",       // page background
  surface:      "#0e1623",       // card / panel surface
  surfaceHover: "#121d2e",       // card hover state
  surfaceDeep:  "#060a10",       // inset / code block backgrounds
  border:       "rgba(255,255,255,0.06)",  // default subtle border
  borderHover:  "rgba(255,255,255,0.11)",  // hover border
  primary:      "#818cf8",       // indigo-400 — primary accent
  primaryDim:   "rgba(129,140,248,0.12)", // primary tint for badges/hover
  primaryGlow:  "rgba(129,140,248,0.2)",
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

export default function CorrelationsTable({ correlations, isLoading, onRefresh }: CorrelationsTableProps) {
  if (isLoading) {
    return (
      <div className="card-premium" style={{ padding: '4rem 2rem', textAlign: 'center', color: T.textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <Loader2 size={32} style={{ color: T.primary, animation: 'spin 1s linear infinite' }} />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)' }}>
          Correlating threat metrics and identifiers across system history...
        </p>
      </div>
    );
  }

  // Filter correlations to highlight actual cross-session threats (seen in > 1 session)
  const crossSessionThreats = correlations.filter(c => c.sessionCount > 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeUp 0.4s ease both' }}>
      
      {/* Header and Summary stats */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, fontFamily: 'var(--font-display)', color: T.text, marginBottom: '4px' }}>
            Cross-Session Attacker Correlations
          </h3>
          <p style={{ fontSize: 'var(--text-sm)', color: T.textSecondary, fontFamily: 'var(--font-display)' }}>
            Map of recurrent attacker signatures and footprints detected across separate ingestion points.
          </p>
        </div>
        
        <button
          onClick={onRefresh}
          style={{
            background: T.primaryDim,
            border: `1px solid ${T.primary}`,
            color: T.primary,
            borderRadius: '10px',
            padding: '10px 20px',
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 'var(--text-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'background-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = T.primaryGlow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = T.primaryDim;
          }}
        >
          <RefreshCw size={14} /> Re-correlate Intel
        </button>
      </div>

      {/* Flag Alert Box */}
      {crossSessionThreats.length > 0 && (
        <div style={{
          display: 'flex',
          gap: '12px',
          padding: '14px 18px',
          borderRadius: '10px',
          background: T.criticalDim,
          border: `1px solid rgba(251, 113, 133, 0.2)`,
          color: T.critical,
          alignItems: 'center',
        }}>
          <ShieldAlert size={20} style={{ flexShrink: 0, color: T.critical }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '14px', fontWeight: 500 }}>
            Identified {crossSessionThreats.length} unique external IP address(es) repeating unauthorized actions across separate log sequences.
          </div>
        </div>
      )}

      {correlations.length === 0 ? (
        <div className="card-premium" style={{ textAlign: 'center', padding: '5rem 2rem', color: T.textSecondary }}>
          <Clock size={40} style={{ marginBottom: '1rem', opacity: 0.4, margin: '0 auto 1rem auto' }} />
          <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600, color: T.text, marginBottom: '0.5rem' }}>
            No Identifier Correlations
          </h4>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
            All threat source signatures are uniquely isolated to single events. Accumulating more log histories triggers correlation triggers.
          </p>
        </div>
      ) : (
        <div className="card-premium" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-premium" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Attacker IP</th>
                  <th style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Sessions</th>
                  <th style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Alert count</th>
                  <th style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Max risk</th>
                  <th style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Severity breakdown</th>
                  <th style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Linked sessions</th>
                  <th style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)', textAlign: 'right' }}>Last observed</th>
                </tr>
              </thead>
              <tbody>
                {correlations.map(corr => {
                  const isCrossSession = corr.sessionCount > 1;
                  const riskColor = corr.maxRiskScore >= 70 ? T.critical : corr.maxRiskScore >= 40 ? T.high : T.low;

                  return (
                    <tr
                      key={corr.ip}
                      style={{
                        borderBottom: `1px solid ${T.border}`,
                        backgroundColor: isCrossSession ? 'rgba(251, 113, 133, 0.02)' : 'transparent',
                        transition: 'background-color 0.15s ease',
                      }}
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="copy-ip-container" onClick={() => copyToClipboard(corr.ip)} title="Click to copy IP">
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, fontSize: '13px', color: T.dataText }}>
                              {corr.ip}
                            </span>
                            <Clipboard size={12} className="copy-ip-icon" />
                          </span>
                          {isCrossSession && (
                            <span style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)', borderRadius: '4px', padding: '2px 8px', fontSize: '11px' }}>
                              <AlertTriangle size={8} style={{ marginRight: '2px', display: 'inline' }} /> PERSISTENT
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 600, color: isCrossSession ? T.critical : T.text }}>
                        {corr.sessionCount} sessions
                      </td>
                      <td style={{ padding: '16px', fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', color: T.textSecondary }}>
                        {corr.alertCount} alerts
                      </td>
                      <td style={{ padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600, color: riskColor }}>
                        {corr.maxRiskScore}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {Object.entries(corr.severities).map(([severity, count]) => {
                            if (count === 0) return null;
                            let color = T.low;
                            let bg = T.lowDim;
                            let border = 'rgba(52, 211, 153, 0.25)';
                            if (severity === 'CRITICAL') {
                              color = T.critical;
                              bg = T.criticalDim;
                              border = 'rgba(251, 113, 133, 0.25)';
                            } else if (severity === 'HIGH') {
                              color = T.high;
                              bg = T.highDim;
                              border = 'rgba(251, 146, 60, 0.25)';
                            } else if (severity === 'MEDIUM') {
                              color = T.medium;
                              bg = T.mediumDim;
                              border = 'rgba(96, 165, 250, 0.25)';
                            }
                            
                            const keyChar = severity[0]; // C, H, M, L

                            return (
                              <span key={severity} className="badge" style={{
                                color: color,
                                background: bg,
                                borderColor: border,
                                fontSize: '10px',
                                padding: '1px 6px',
                                textTransform: 'uppercase',
                              }}>
                                {keyChar}:{count}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ padding: '16px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                          {corr.sessionNames.map((name, i) => (
                            <span key={i} title={name} style={{
                              fontSize: '12px',
                              fontFamily: 'var(--font-mono)',
                              color: T.textMuted,
                              maxWidth: '120px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {name.replace(/^EDR:/, '🖥️ ')}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '12px', fontFamily: 'var(--font-mono)', color: T.textSecondary, textAlign: 'right' }}>
                        {new Date(corr.lastSeen).toLocaleDateString().toLowerCase()} {new Date(corr.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
