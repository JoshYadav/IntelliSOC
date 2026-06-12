import { Clipboard } from 'lucide-react';
import type { Alert } from '../types';

interface AlertsTableProps {
  alerts: Alert[];
}

const T = {
  bg:           "#080d16",
  surface:      "#0e1623",
  surfaceHover: "#121d2e",
  border:       "rgba(255,255,255,0.06)",
  primary:      "#818cf8",
  dataText:     "#a5b4fc",
  text:         "#f1f5f9",
  textSecondary:"#94a3b8",
  low:          "#34d399",
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).catch(() => {});
  window.dispatchEvent(new CustomEvent('show-toast', { detail: `Copied IP ${text} to clipboard` }));
};

export default function AlertsTable({ alerts }: AlertsTableProps) {
  if (alerts.length === 0) {
    return (
      <div style={{
        padding: '3rem 1.5rem',
        textAlign: 'center',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: '16px',
        color: T.textSecondary,
      }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600, color: T.text, marginBottom: '8px' }}>
          Integrity normal
        </h3>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)' }}>No threat signatures detected in the analyzed sequence.</p>
      </div>
    );
  }

  const getBadgeClass = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'badge-critical';
      case 'HIGH': return 'badge-high';
      case 'MEDIUM': return 'badge-medium';
      case 'LOW':
      default: return 'badge-low';
    }
  };

  return (
    <div className="card-premium" style={{ borderRadius: '12px', overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="table-premium">
          <thead>
            <tr style={{ background: 'rgba(6, 182, 212, 0.05)' }}>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>Type</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>Source IP</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>User</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>Severity</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>Risk Score</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>MITRE Tactic</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>Events</th>
              <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#64748b' }}>Analyst Note</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert, index) => {
              return (
                <tr
                  key={alert.id}
                  style={{
                    animation: 'fadeUp 0.3s ease both',
                    animationDelay: `${index * 20}ms`,
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    transition: 'background 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(6, 182, 212, 0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {/* Type Badge */}
                  <td>
                    <span className="badge" style={{
                      background: 'rgba(129, 140, 248, 0.08)',
                      color: T.primary,
                      border: `1px solid rgba(129, 140, 248, 0.2)`
                    }}>
                      {alert.type.replace(/_/g, ' ')}
                    </span>
                  </td>

                  {/* Source IP */}
                  <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '12px', color: '#06b6d4', fontWeight: 500 }}>
                    <span className="copy-ip-container" onClick={() => copyToClipboard(alert.ip)} title="Click to copy IP">
                      <span>{alert.ip}</span>
                      <Clipboard size={12} className="copy-ip-icon" />
                    </span>
                  </td>

                  {/* User */}
                  <td style={{ color: T.text }}>
                    {alert.user || 'SYSTEM'}
                  </td>

                  {/* Severity Pill */}
                  <td>
                    <span className={getBadgeClass(alert.severity)}>
                      {alert.severity}
                    </span>
                  </td>

                  {/* Risk Score */}
                  <td style={{ color: T.text, fontWeight: 600 }}>
                    {alert.riskScore}
                  </td>

                  {/* MITRE Tactic (Inter T.textSecondary) */}
                  <td style={{ color: T.textSecondary }}>
                    {alert.mitreTactic || '—'}
                  </td>

                  {/* Events count */}
                  <td style={{ color: T.text, fontWeight: 500 }}>
                    {alert.count}
                  </td>

                  {/* Analyst Note */}
                  <td
                    title={alert.explanation || ''}
                    style={{
                      color: T.textSecondary,
                      maxWidth: '250px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {alert.explanation || '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
