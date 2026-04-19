import type { Alert } from '../types';
import { ShieldCheck, Activity, Globe, User, AlertCircle, Hash, Target, AlignLeft } from 'lucide-react';

interface AlertsTableProps {
  alerts: Alert[];
}

const severityColors: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
  HIGH: { bg: 'rgba(249, 115, 22, 0.15)', text: '#f97316', border: 'rgba(249, 115, 22, 0.3)' },
  MEDIUM: { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: 'rgba(234, 179, 8, 0.3)' },
  LOW: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
};

const typeLabels: Record<string, { label: string; icon: string }> = {
  BRUTE_FORCE: { label: 'Brute Force', icon: '🔨' },
  MULTIPLE_USERS: { label: 'Multi-User', icon: '👥' },
  ACCOUNT_COMPROMISE: { label: 'Compromise', icon: '💀' },
};

export default function AlertsTable({ alerts }: AlertsTableProps) {
  if (alerts.length === 0) {
    return (
      <div className="glass-card flex flex-col items-center justify-center text-center p-12 text-slate-400">
        <ShieldCheck size={56} className="mb-4 text-emerald-500 opacity-80" />
        <h3 className="text-xl font-semibold text-slate-200 mb-2">No threats detected 🎉</h3>
        <p className="text-sm">Your systems are currently secure. We'll notify you if anything suspicious occurs.</p>
      </div>
    );
  }

  const thStyle: React.CSSProperties = {
    padding: '0.85rem 1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-text-secondary)',
    borderBottom: '1px solid var(--color-border)',
    whiteSpace: 'nowrap',
  };

  const tdStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    fontSize: '0.85rem',
    borderBottom: '1px solid var(--color-border)',
    verticalAlign: 'top',
  };

  return (
    <div className="glass-card animate-fade-in-up" style={{ overflow: 'hidden' }}>
      <div className="overflow-x-auto max-h-[600px] overflow-y-auto custom-scrollbar">
        <table className="w-full border-collapse min-w-[900px] relative text-left">
          <thead className="sticky top-0 z-10 backdrop-blur-md bg-[#0a0e1a]/80 shadow-sm">
            <tr>
              <th style={thStyle}><div className="flex items-center gap-2"><Activity size={14} /> Type</div></th>
              <th style={thStyle}><div className="flex items-center gap-2 text-cyan-400/80"><Globe size={14} /> IP Address</div></th>
              <th style={thStyle}><div className="flex items-center gap-2"><User size={14} /> User</div></th>
              <th style={thStyle}><div className="flex items-center gap-2"><AlertCircle size={14} /> Severity</div></th>
              <th style={thStyle}><div className="flex items-center gap-2"><Hash size={14} /> Risk</div></th>
              <th style={thStyle}><div className="flex items-center gap-2"><Target size={14} /> MITRE ATT&CK</div></th>
              <th style={thStyle}><div className="flex items-center gap-2"><Hash size={14} /> Count</div></th>
              <th style={thStyle}><div className="flex items-center gap-2"><AlignLeft size={14} /> Explanation</div></th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert, index) => {
              const sev = severityColors[alert.severity] || severityColors.LOW;
              const typeInfo = typeLabels[alert.type] || { label: alert.type, icon: '⚠️' };
              const isCritical = alert.severity === 'CRITICAL';

              return (
                <tr
                  key={alert.id}
                  className="animate-slide-in hover:bg-white/5 even:bg-white/[0.02] transition-colors duration-300 ease-in-out cursor-default"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.3rem 0.6rem',
                      borderRadius: '6px',
                      background: 'rgba(59, 130, 246, 0.1)',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                    }}>
                      {typeInfo.icon} {typeInfo.label}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', color: 'var(--color-accent-cyan)' }} title={`Source IP: ${alert.ip}`}>
                    {alert.ip}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--color-text-secondary)' }}>
                    {alert.user || '—'}
                  </td>
                  <td style={tdStyle}>
                    <span 
                      className={`inline-block px-3 py-1 rounded-md text-xs font-bold tracking-wider border ${isCritical ? 'animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'shadow-sm'}`}
                      style={{
                        background: sev.bg,
                        borderColor: sev.border,
                        color: sev.text,
                      }}
                      title={`Severity Level: ${alert.severity}`}
                    >
                      {alert.severity}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}>
                      <div style={{
                        width: '40px',
                        height: '6px',
                        borderRadius: '3px',
                        background: 'rgba(255,255,255,0.08)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${alert.riskScore}%`,
                          height: '100%',
                          borderRadius: '3px',
                          background: alert.riskScore >= 80
                            ? 'var(--color-critical)' : alert.riskScore >= 50
                              ? 'var(--color-high)' : 'var(--color-medium)',
                          transition: 'width 0.5s ease',
                        }} />
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {alert.riskScore}
                      </span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, fontSize: '0.78rem', color: 'var(--color-accent-violet)' }} title={alert.mitreTactic ? `MITRE Framework Tactic: ${alert.mitreTactic}` : ''}>
                    {alert.mitreTactic || '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 600 }}>
                    {alert.count}
                  </td>
                  <td 
                    title={alert.explanation || 'No explanation provided'}
                    style={{
                      ...tdStyle,
                      fontSize: '0.78rem',
                      color: 'var(--color-text-secondary)',
                      maxWidth: '300px',
                      lineHeight: 1.4,
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
