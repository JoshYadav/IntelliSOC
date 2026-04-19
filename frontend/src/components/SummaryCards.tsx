import { FileText, AlertTriangle, ShieldAlert, Siren, Eye, Globe } from 'lucide-react';
import type { AnalyticsData } from '../types';

interface SummaryCardsProps {
  analytics: AnalyticsData | null;
  logsProcessed: number;
  alertsGenerated: number;
}

interface CardData {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  subtitle?: string;
}

export default function SummaryCards({ analytics, logsProcessed, alertsGenerated }: SummaryCardsProps) {
  const cards: CardData[] = [
    {
      title: 'Total Logs',
      value: analytics?.totalLogs ?? logsProcessed,
      icon: <FileText size={22} />,
      color: 'var(--color-accent-blue)',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      subtitle: 'Lines parsed',
    },
    {
      title: 'Total Alerts',
      value: analytics?.totalAlerts ?? alertsGenerated,
      icon: <AlertTriangle size={22} />,
      color: 'var(--color-accent-amber)',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      subtitle: 'Threats detected',
    },
    {
      title: 'Critical',
      value: analytics?.alertsBySeverity?.['CRITICAL'] ?? 0,
      icon: <Siren size={22} />,
      color: 'var(--color-critical)',
      bgColor: 'rgba(239, 68, 68, 0.1)',
      subtitle: 'Immediate action',
    },
    {
      title: 'High Severity',
      value: analytics?.alertsBySeverity?.['HIGH'] ?? 0,
      icon: <ShieldAlert size={22} />,
      color: 'var(--color-high)',
      bgColor: 'rgba(249, 115, 22, 0.1)',
      subtitle: 'Needs attention',
    },
    {
      title: 'Medium Severity',
      value: analytics?.alertsBySeverity?.['MEDIUM'] ?? 0,
      icon: <Eye size={22} />,
      color: 'var(--color-medium)',
      bgColor: 'rgba(234, 179, 8, 0.1)',
      subtitle: 'Monitor closely',
    },
    {
      title: 'Unique IPs',
      value: analytics?.topIPs?.length ?? 0,
      icon: <Globe size={22} />,
      color: 'var(--color-accent-cyan)',
      bgColor: 'rgba(6, 182, 212, 0.1)',
      subtitle: 'Source addresses',
    },
    {
      title: 'Risk Score',
      value: analytics?.riskDistribution?.[0]?.value
        ? `${analytics.riskDistribution[0].value} Critical`
        : '—',
      icon: <AlertTriangle size={22} />,
      color: 'var(--color-accent-violet)',
      bgColor: 'rgba(139, 92, 246, 0.1)',
      subtitle: 'Highest bracket',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
      gap: '1rem',
      marginBottom: '2rem',
    }}>
      {cards.map((card, i) => (
        <div
          key={card.title}
          className={`glass-card animate-fade-in-up delay-${i + 1}`}
          style={{
            padding: '1.25rem',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Accent bar */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: card.color,
            opacity: 0.7,
          }} />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'var(--color-text-secondary)',
            }}>
              {card.title}
            </span>
            <span style={{
              fontSize: '1.5rem',
              width: '2.25rem',
              height: '2.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 'var(--radius-sm)',
              background: card.bgColor,
              color: card.color,
            }}>
              {card.icon}
            </span>
          </div>

          <div style={{
            fontSize: '1.75rem',
            fontWeight: 800,
            color: card.color,
            lineHeight: 1.1,
            marginBottom: '0.25rem',
          }}>
            {card.value}
          </div>

          {card.subtitle && (
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--color-text-muted)',
            }}>
              {card.subtitle}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
