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
      color: T.text,
    },
    {
      label: 'Threats Detected',
      value: analytics?.totalAlerts ?? alertsGenerated,
      color: T.text,
    },
    {
      label: 'Immediate Action',
      value: criticalCount,
      color: criticalCount > 0 ? T.critical : T.text,
    },
    {
      label: 'Needs Attention',
      value: highCount,
      color: highCount > 0 ? T.high : T.text,
    },
    {
      label: 'Monitor',
      value: analytics?.alertsBySeverity?.['MEDIUM'] ?? 0,
      color: T.text,
    },
    {
      label: 'Source Addresses',
      value: analytics?.topIPs?.length ?? 0,
      color: T.text,
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(6, 1fr)',
      gap: '1.5rem', // spacious layout
      marginBottom: '3rem',
    }}>
      {cards.map((card, i) => (
        <div
          key={card.label}
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            transition: 'border-color 0.15s ease',
            animation: 'fadeUp 0.4s ease both',
            animationDelay: `${i * 60}ms`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = T.borderHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = T.border;
          }}
        >
          {/* Large Number */}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '3.25rem',
            fontWeight: 700,
            color: card.color,
            lineHeight: 1.1,
            marginBottom: '8px',
          }}>
            {card.value}
          </div>

          {/* Label Below */}
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-sm)',
            fontWeight: 500,
            color: T.textSecondary,
          }}>
            {card.label}
          </div>
        </div>
      ))}
    </div>
  );
}
