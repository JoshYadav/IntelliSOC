import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, XAxis, YAxis
} from 'recharts';
import type { Alert, AnalyticsData } from '../types';

interface AnalyticsChartsProps {
  analytics: AnalyticsData | null;
  alerts: Alert[];
}

const T = {
  bg:           "#080d16",
  surface:      "#0e1623",
  surfaceHover: "#121d2e",
  surfaceDeep:  "#060a10",
  border:       "rgba(255,255,255,0.06)",
  primary:      "#818cf8",
  primaryDim:   "rgba(129,140,248,0.12)",
  critical:     "#fb7185",
  high:         "#fb923c",
  medium:       "#60a5fa",
  low:          "#34d399",
  text:         "#f1f5f9",
  textSecondary:"#94a3b8",
  textMuted:    "#475569",
  purple:       "#bf5af2",
  accent:       "#00e5ff",
};

const chartTheme = {
  background: "transparent",
  cartesianGrid: { stroke: "rgba(255,255,255,0.04)", strokeDasharray: "3 6", vertical: false },
  xAxis: { tick: { fill: "#475569", fontSize: 11, fontFamily: "Inter" }, axisLine: false, tickLine: false },
  yAxis: { tick: { fill: "#475569", fontSize: 11, fontFamily: "Inter" }, axisLine: false, tickLine: false },
  tooltip: {
    contentStyle: {
      background: "#0e1623",
      border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "10px",
      fontFamily: "Inter",
      fontSize: 13,
      color: "#f1f5f9"
    },
    cursor: { stroke: "rgba(255,255,255,0.06)" }
  }
};

const ATTACK_COLORS: Record<string, string> = {
  "CREDENTIAL_DUMPING":   "#fb7185",  // rose
  "SUSPICIOUS_NETWORK":   "#c084fc",  // violet
  "PERSISTENCE_RUN_KEY":  "#fb923c",  // orange
  "LOLBIN_ABUSE":         "#facc15",  // yellow
  "SCHEDULED_TASK_PERSIST":"#34d399", // emerald
  "SUSPICIOUS_POWERSHELL":"#38bdf8",  // sky blue
};

const getAttackTypeColor = (type: string) => {
  const norm = type.toUpperCase().replace(/\s+/g, '_').trim();
  if (ATTACK_COLORS[norm]) return ATTACK_COLORS[norm];
  if (norm.includes('DUMPING') || norm.includes('CRITICAL')) return ATTACK_COLORS.CREDENTIAL_DUMPING;
  if (norm.includes('NETWORK') || norm.includes('BEACONING')) return ATTACK_COLORS.SUSPICIOUS_NETWORK;
  if (norm.includes('RUN_KEY') || norm.includes('PERSISTENCE')) return ATTACK_COLORS.PERSISTENCE_RUN_KEY;
  if (norm.includes('LOLBIN')) return ATTACK_COLORS.LOLBIN_ABUSE;
  if (norm.includes('SCHED') || norm.includes('SCHEDULED') || norm.includes('TASK')) return ATTACK_COLORS.SCHEDULED_TASK_PERSIST;
  if (norm.includes('POWERSHELL')) return ATTACK_COLORS.SUSPICIOUS_POWERSHELL;
  if (norm.includes('BRUTE_FORCE') || norm.includes('COMPROMISE')) return ATTACK_COLORS.CREDENTIAL_DUMPING;
  if (norm.includes('PORT_SCAN') || norm.includes('SCAN') || norm.includes('DIRECTORY')) return ATTACK_COLORS.LOLBIN_ABUSE;
  
  const colors = Object.values(ATTACK_COLORS);
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const formatLegendLabel = (name: string): string => {
  const norm = name.toUpperCase().replace(/\s+/g, '_').trim();
  if (norm.includes('CREDENTIAL_DUMPING')) return 'Credential Dumping';
  if (norm.includes('SUSPICIOUS_NETWORK')) return 'Suspicious Network';
  if (norm.includes('PERSISTENCE_RUN_KEY')) return 'Persistence Run Key';
  if (norm.includes('LOLBIN_ABUSE')) return 'LolBin Abuse';
  if (norm.includes('SCHEDULED_TASK') || norm.includes('SCHED_TASK_PERSIST')) return 'Scheduled Task';
  if (norm.includes('SUSPICIOUS_POWERSHELL')) return 'Suspicious PowerShell';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const SEVERITY_BAR_STYLES: Record<string, { background: string; boxShadow: string }> = {
  Critical: {
    background: "linear-gradient(90deg, #fb7185cc, #fb7185)",
    boxShadow: "0 0 12px rgba(251,113,133,0.5), 0 0 24px rgba(251,113,133,0.2)"
  },
  High: {
    background: "linear-gradient(90deg, #fb923ccc, #fb923c)",
    boxShadow: "0 0 12px rgba(251,146,60,0.5), 0 0 24px rgba(251,146,60,0.2)"
  },
  Medium: {
    background: "linear-gradient(90deg, #60a5facc, #60a5fa)",
    boxShadow: "0 0 12px rgba(96,165,250,0.5), 0 0 24px rgba(96,165,250,0.2)"
  },
  Low: {
    background: "linear-gradient(90deg, #34d399cc, #34d399)",
    boxShadow: "0 0 12px rgba(52,211,153,0.5), 0 0 24px rgba(52,211,153,0.2)"
  }
};

export default function AnalyticsCharts({ analytics, alerts }: AnalyticsChartsProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!analytics) return null;

  // Counts
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').reduce((sum, a) => sum + a.count, 0);
  const highCount = alerts.filter(a => a.severity === 'HIGH').reduce((sum, a) => sum + a.count, 0);
  const mediumCount = alerts.filter(a => a.severity === 'MEDIUM').reduce((sum, a) => sum + a.count, 0);
  const lowCount = alerts.filter(a => a.severity === 'LOW').reduce((sum, a) => sum + a.count, 0);

  // Donut data
  const typeMap = alerts.reduce((acc, alert) => {
    const name = alert.type.replace(/_/g, ' ');
    acc[name] = (acc[name] || 0) + alert.count;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(typeMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalPieValue = pieData.reduce((sum, d) => sum + d.value, 0);

  // Severity Breakdown
  const severityBreakdown = [
    { name: 'Critical', value: criticalCount, color: T.critical },
    { name: 'High', value: highCount, color: T.high },
    { name: 'Medium', value: mediumCount, color: T.medium },
    { name: 'Low', value: lowCount, color: T.low }
  ];

  const maxSeverityVal = Math.max(...severityBreakdown.map(s => s.value), 1);

  // Timeline Data
  const timelineData = (() => {
    if (alerts.length === 0) return Array(12).fill(0).map((_, i) => ({ time: `T-${12-i}`, count: 0 }));
    const sorted = [...alerts].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const minTime = new Date(sorted[0].timestamp).getTime();
    const maxTime = new Date(sorted[sorted.length - 1].timestamp).getTime();
    const range = maxTime - minTime;

    if (range <= 0) {
      const total = sorted.reduce((sum, a) => sum + a.count, 0);
      return Array(12).fill(0).map((_, i) => ({ time: `T-${12-i}`, count: i === 11 ? total : 0 }));
    }

    const step = range / 12;
    return Array(12).fill(0).map((_, i) => {
      const start = minTime + i * step;
      const end = start + step;
      const count = sorted
        .filter(a => {
          const t = new Date(a.timestamp).getTime();
          return t >= start && t < end;
        })
        .reduce((sum, a) => sum + a.count, 0);
      const label = new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      return { time: label, count };
    });
  })();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 55% / 45% Split Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '5.5fr 4.5fr',
        gap: '1.5rem',
      }}>
        {/* Left Column (55%): Donut Chart */}
        <div style={{
          background: "linear-gradient(135deg, rgba(129,140,248,0.05) 0%, #0e1623 50%)",
          border: `1px solid ${T.border}`,
          borderRadius: '12px',
          padding: '16px',
          animation: 'fadeUp 0.4s ease both',
        }}>
          <h4 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            fontWeight: 600,
            color: T.textSecondary,
            marginBottom: '16px'
          }}>
            Attack Type Distribution
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px' }}>
            {/* Donut Container */}
            <div style={{
              background: "radial-gradient(ellipse at center, rgba(129,140,248,0.06) 0%, transparent 70%)",
              borderRadius: 16,
              padding: 8,
            }}>
              <div style={{ position: 'relative', width: '180px', height: '180px', flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={58}
                      outerRadius={90}
                      paddingAngle={3}
                      startAngle={90}
                      endAngle={-270}
                      dataKey="value"
                      stroke="none"
                      style={{ filter: "drop-shadow(0 0 8px rgba(129,140,248,0.3))" }}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getAttackTypeColor(entry.name)} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Center Overlay */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '36px',
                    fontWeight: 700,
                    color: T.text,
                    lineHeight: 1,
                  }}>
                    {totalPieValue}
                  </div>
                  <div style={{
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '12px',
                    fontWeight: 400,
                    color: T.textMuted,
                    marginTop: '4px',
                  }}>
                    alerts
                  </div>
                </div>
              </div>
            </div>

            {/* Donut Legend */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {pieData.slice(0, 5).map((entry) => {
                const color = getAttackTypeColor(entry.name);
                const pct = totalPieValue > 0 ? (entry.value / totalPieValue) * 100 : 0;
                return (
                  <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                      <span style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        flexShrink: 0
                      }} />
                      <span style={{
                        color: T.textSecondary,
                        fontFamily: 'Inter, sans-serif',
                        fontWeight: 500,
                        fontSize: '12px',
                        lineHeight: 1.2
                      }}>
                        {formatLegendLabel(entry.name)}
                      </span>
                    </div>
                    <span style={{ color: color, fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '12px' }}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (45%): Severity Breakdown Bars */}
        <div style={{
          background: "linear-gradient(135deg, rgba(251,113,133,0.04) 0%, #0e1623 50%)",
          border: `1px solid ${T.border}`,
          borderRadius: '12px',
          padding: '16px',
          animation: 'fadeUp 0.4s ease both',
          animationDelay: '60ms',
        }}>
          <h4 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            fontWeight: 600,
            color: T.textSecondary,
            marginBottom: '16px'
          }}>
            Severity Breakdown
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {severityBreakdown.map((row) => {
              const isPositive = row.value > 0;
              const barWidth = isPositive ? `${(row.value / maxSeverityVal) * 100}%` : '0%';
              return (
                <div key={row.name} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: T.textSecondary, fontSize: '13px' }}>{row.name}</span>
                    <span style={{
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                      color: isPositive ? row.color : T.textMuted,
                      textShadow: isPositive ? `0 0 16px ${row.color}` : "none"
                    }}>
                      {row.value}
                    </span>
                  </div>
                  <div style={{ height: '7px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: animate ? barWidth : '0%',
                      background: SEVERITY_BAR_STYLES[row.name]?.background || row.color,
                      boxShadow: SEVERITY_BAR_STYLES[row.name]?.boxShadow || 'none',
                      borderRadius: '4px',
                      transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Threat Timeline Area Chart (Full Width) */}
      <div style={{
        background: "linear-gradient(180deg, rgba(129,140,248,0.04) 0%, #0e1623 40%)",
        border: `1px solid ${T.border}`,
        borderRadius: '12px',
        padding: '16px',
        animation: 'fadeUp 0.4s ease both',
        animationDelay: '120ms',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h4 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            fontWeight: 600,
            color: T.textSecondary
          }}>
            Threat Timeline Profile
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.low, display: 'inline-block' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: T.low, fontWeight: 500 }}>
              threat subsiding
            </span>
          </div>
        </div>

        {/* Timeline area chart */}
        <div style={{
          background: "linear-gradient(180deg, rgba(129,140,248,0.04) 0%, transparent 100%)",
          borderRadius: 12,
          padding: "16px 16px 8px 16px",
          height: '220px',
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{ filter: "drop-shadow(0 0 6px rgba(129,140,248,0.5))", height: '100%', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                <defs>
                  <linearGradient id="timelineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#818cf8" stopOpacity={0.5} />
                    <stop offset="40%"  stopColor="#818cf8" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...chartTheme.cartesianGrid} />
                <XAxis dataKey="time" {...chartTheme.xAxis} />
                <YAxis {...chartTheme.yAxis} />
                <Tooltip {...chartTheme.tooltip} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={T.primary}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#timelineGrad)"
                  dot={false}
                  activeDot={{ 
                    r: 6, 
                    fill: "#818cf8", 
                    strokeWidth: 2, 
                    stroke: "rgba(129,140,248,0.4)",
                    style: { filter: "drop-shadow(0 0 6px #818cf8)" }
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

    </div>
  );
}
