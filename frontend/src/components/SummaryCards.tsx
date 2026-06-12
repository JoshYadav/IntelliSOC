
import type { AnalyticsData } from '../types';

interface SummaryCardsProps {
  analytics: AnalyticsData | null;
  logsProcessed: number;
  alertsGenerated: number;
}

const T = {
  bg:           "#080d16",
  surface:      "#0e1623",
  border:       "rgba(255,255,255,0.06)",
  borderHover:  "rgba(255,255,255,0.11)",
  primary:      "#818cf8",
  critical:     "#fb7185",
  high:         "#fb923c",
  text:         "#f1f5f9",
  textSecondary:"#94a3b8",
};

export default function SummaryCards({ analytics, logsProcessed, alertsGenerated }: SummaryCardsProps) {
  const criticalCount = Number(analytics?.alertsBySeverity?.['CRITICAL'] ?? 0);
  const highCount = Number(analytics?.alertsBySeverity?.['HIGH'] ?? 0);

  const cards = [
    {
      label: 'Lines Parsed',
      value: analytics?.totalLogs ?? logsProcessed,
      color: '#e2e8f0',
    },
    {
      label: 'Threats Detected',
      value: analytics?.totalAlerts ?? alertsGenerated,
      color: '#e2e8f0',
    },
    {
      label: 'Immediate Action',
      value: criticalCount,
      color: criticalCount > 0 ? T.critical : '#e2e8f0',
    },
    {
      label: 'Needs Attention',
      value: highCount,
      color: highCount > 0 ? T.high : '#e2e8f0',
    },
    {
      label: 'Monitor',
      value: analytics?.alertsBySeverity?.['MEDIUM'] ?? 0,
      color: '#e2e8f0',
    },
    {
      label: 'Source Addresses',
      value: analytics?.topIPs?.length ?? 0,
      color: '#e2e8f0',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: '1.5rem',
      marginBottom: '3rem',
    }}>
      {cards.map((card, i) => (
        <div
          key={card.label}
          style={{
            background: 'linear-gradient(135deg, #0d1526 0%, #0a0f1e 100%)',
            border: '1px solid rgba(6, 182, 212, 0.12)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 0 24px rgba(6, 182, 212, 0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
            transition: 'all 0.3s ease',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            animation: 'fade-in-up 0.4s ease both',
            animationDelay: `${i * 60}ms`,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.35)';
            e.currentTarget.style.boxShadow = '0 0 32px rgba(6, 182, 212, 0.14), inset 0 1px 0 rgba(255,255,255,0.06)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.12)';
            e.currentTarget.style.boxShadow = '0 0 24px rgba(6, 182, 212, 0.06), inset 0 1px 0 rgba(255,255,255,0.04)';
          }}
        >
          {/* Decorative top-right glow accent */}
          <div style={{
            position: 'absolute', top: 0, right: 0,
            width: '80px', height: '80px',
            background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
            borderRadius: '0 12px 0 0'
          }} />

          {/* Large Number */}
          <div style={{
            fontSize: '2.2rem',
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            color: card.color || '#e2e8f0',
          }}>
            {Number(card.value).toLocaleString()}
          </div>

          {/* Label Below */}
          <div style={{
            fontSize: '11px',
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#64748b',
            marginTop: '6px',
            fontFamily: "'Inter', sans-serif"
          }}>
            {card.label}
          </div>
        </div>
      ))}
    </div>
  );
}
