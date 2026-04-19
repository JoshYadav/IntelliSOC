import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LabelList
} from 'recharts';
import { PieChart as PieIcon, BarChart3, Globe2 } from 'lucide-react';
import type { AnalyticsData } from '../types';

interface AnalyticsChartsProps {
  analytics: AnalyticsData | null;
}

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#ec4899', '#14b8a6'];
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#22c55e',
};

const tooltipStyle = {
  backgroundColor: '#1a1f35',
  border: '1px solid rgba(148,163,184,0.15)',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '0.8rem',
  padding: '8px 12px',
};

export default function AnalyticsCharts({ analytics }: AnalyticsChartsProps) {
  if (!analytics) return null;

  // Prepare data for attack distribution pie chart
  const attackData = Object.entries(analytics.alertsByType).map(([name, value]) => ({
    name: name.replace(/_/g, ' '),
    value,
  }));

  // Prepare data for severity bar chart
  const severityData = Object.entries(analytics.alertsBySeverity).map(([name, value]) => ({
    name,
    value,
    fill: SEVERITY_COLORS[name] || '#64748b',
  }));

  const ipData = analytics.topIPs.slice(0, 8);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem',
    }}>
      {/* Attack Distribution Pie */}
      <div className="glass-card animate-fade-in-up delay-1" style={{ padding: '1.5rem' }}>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">
          <PieIcon size={18} className="text-blue-500" /> Attack Distribution
        </div>
        {attackData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={attackData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {attackData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={tooltipStyle} 
                itemStyle={{ color: '#f8fafc' }}
                formatter={(value: any) => [`${value} Alerts`, 'Occurrences']}
              />
              <Legend
                wrapperStyle={{ fontSize: '0.75rem', color: '#94a3b8' }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem' }}>
            No attack data available
          </div>
        )}
      </div>

      {/* Severity Distribution Bar */}
      <div className="glass-card animate-fade-in-up delay-2" style={{ padding: '1.5rem' }}>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">
          <BarChart3 size={18} className="text-orange-500" /> Severity Breakdown
        </div>
        {severityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={severityData} barCategoryGap="25%" margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(148,163,184,0.1)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={tooltipStyle} 
                itemStyle={{ color: '#f8fafc' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }} 
                formatter={(value: any) => [`${value} Alerts`, 'Occurrences']}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {severityData.map((entry, index) => (
                  <Cell key={`bar-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem' }}>
            No severity data available
          </div>
        )}
      </div>

      {/* IP Activity Bar Chart */}
      <div className="glass-card animate-fade-in-up delay-3" style={{
        padding: '1.5rem',
        gridColumn: 'span 2',
      }}>
        <div className="flex items-center gap-2 text-sm font-bold text-slate-400 uppercase tracking-widest mb-6">
          <Globe2 size={18} className="text-cyan-400" /> Top IP Activity
        </div>
        {ipData.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ipData} layout="vertical" barCategoryGap="20%" margin={{ top: 10, right: 30, left: 10, bottom: 0 }}>
              <XAxis
                type="number"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={{ stroke: 'rgba(148,163,184,0.1)' }}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                type="category"
                dataKey="ip"
                tick={{ fill: '#06b6d4', fontSize: 11, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
                width={130}
              />
              <Tooltip 
                contentStyle={tooltipStyle} 
                itemStyle={{ color: '#f8fafc' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                formatter={(value: any) => [`${value} Events`, 'Total']}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]}>
                {ipData.map((_entry, index) => (
                  <Cell key={`ip-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
                <LabelList dataKey="count" position="right" fill="#94a3b8" fontSize={11} fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '3rem' }}>
            No IP activity data available
          </div>
        )}
      </div>
    </div>
  );
}
