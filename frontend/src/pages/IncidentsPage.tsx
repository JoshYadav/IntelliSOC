import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getIncidents } from '../api/client';
import type { Incident } from '../types';
import { RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { formatIncidentTitleAndSubtitle } from '../utils/incident';

const T = {
  bg:           "#080d16",       // page background
  surface:      "#0e1623",       // card / panel surface
  surfaceHover: "#121d2e",       // card hover state
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

const getPriorityColor = (prio: string) => {
  switch (prio?.toUpperCase()) {
    case 'CRITICAL': return T.critical;
    case 'HIGH': return T.high;
    case 'MEDIUM': return T.medium;
    case 'LOW':
    default: return T.low;
  }
};

const getStatusBadgeStyles = (status: string) => {
  switch (status?.toUpperCase()) {
    case 'OPEN':
      return { background: 'rgba(251,146,60,0.1)', color: '#fb923c', border: '1px solid rgba(251,146,60,0.3)' };
    case 'RESOLVED':
      return { background: T.lowDim, color: T.low, border: `1px solid ${T.low}` };
    case 'IN_PROGRESS':
    default:
      return { background: T.mediumDim, color: T.medium, border: `1px solid ${T.medium}` };
  }
};

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchIncidentsData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: { status?: string; priority?: string } = {};
      if (statusFilter !== 'ALL') filters.status = statusFilter;
      if (priorityFilter !== 'ALL') filters.priority = priorityFilter;

      const data = await getIncidents(filters);
      setIncidents(data);
    } catch (err: any) {
      console.error('Failed to load incidents:', err);
      setError(
        err?.response?.data?.error ??
        err?.message ??
        'Failed to fetch incidents. Please verify backend is running.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    fetchIncidentsData();
  }, [fetchIncidentsData]);

  // Derive counts
  const totalCount = incidents.length;
  const openCount = incidents.filter(i => i.status === 'OPEN').length;
  const criticalCount = incidents.filter(i => i.priority === 'CRITICAL' || i.priority === 'HIGH').length;
  const resolvedCount = incidents.filter(i => i.status === 'RESOLVED').length;

  const statCards = [
    { label: 'Total Incidents', value: totalCount, color: T.text },
    { label: 'Active (Open)', value: openCount, color: openCount > 0 ? T.primary : T.text },
    { label: 'Critical / High Priority', value: criticalCount, color: criticalCount > 0 ? T.critical : T.text },
    { label: 'Resolved', value: resolvedCount, color: T.text },
  ];

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* 4 Stat Cards Top */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1.5rem',
        marginBottom: '3rem',
      }}>
        {statCards.map((card, i) => (
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
              justifyContent: 'center',
              animation: 'fadeUp 0.4s ease both',
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
            <div style={{
              fontSize: '2.2rem',
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: card.color || '#e2e8f0',
              marginBottom: '8px',
            }}>
              {card.value}
            </div>
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

      {/* Filters & Actions bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="op-select"
            style={{
              background: '#0d1526',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              borderRadius: '8px',
              color: '#e2e8f0',
              padding: '7px 32px 7px 12px',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
              appearance: 'auto',
              WebkitAppearance: 'auto'
            }}
          >
            <option value="ALL">Status: All</option>
            <option value="OPEN">Status: Open</option>
            <option value="IN_PROGRESS">Status: In Progress</option>
            <option value="RESOLVED">Status: Resolved</option>
            <option value="FALSE_POSITIVE">Status: False Positive</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="op-select"
            style={{
              background: '#0d1526',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              borderRadius: '8px',
              color: '#e2e8f0',
              padding: '7px 32px 7px 12px',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer',
              appearance: 'auto',
              WebkitAppearance: 'auto'
            }}
          >
            <option value="ALL">Priority: All</option>
            <option value="CRITICAL">Priority: Critical</option>
            <option value="HIGH">Priority: High</option>
            <option value="MEDIUM">Priority: Medium</option>
            <option value="LOW">Priority: Low</option>
          </select>
        </div>

        <button
          className="btn-secondary"
          onClick={fetchIncidentsData}
          disabled={isLoading}
        >
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 16px', marginBottom: '1.5rem', borderRadius: '8px',
          background: 'rgba(251, 113, 133, 0.08)', border: `1px solid rgba(251, 113, 133, 0.25)`,
          color: T.critical, fontSize: '13px', fontFamily: 'var(--font-display)',
        }}>
          <span>Error: {error}</span>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: T.textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Loader2 size={24} style={{ color: T.primary }} className="animate-spin" />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px' }}>Loading incidents database...</p>
        </div>
      ) : incidents.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 1.5rem',
          color: T.textSecondary,
          border: `1px dashed ${T.border}`,
          borderRadius: '16px',
          background: T.surface,
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: T.text, marginBottom: '8px' }}>
            No incidents found
          </h3>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px', maxWidth: '380px', margin: '0 auto', lineHeight: 1.5 }}>
            No incidents matched your query filter. Verify your parameters or upload new log files to trigger.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {incidents.map((incident, idx) => {
            const prioColor = getPriorityColor(incident.priority);
            const statusStyles = getStatusBadgeStyles(incident.status);
            const alertsCount = incident._count?.alerts ?? incident.alerts?.length ?? 0;
            const formattedDate = new Date(incident.createdAt).toLocaleDateString() + ' ' +
              new Date(incident.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            const { title: mainTitle, subtitle: rawAlerts } = formatIncidentTitleAndSubtitle(incident);

            return (
              <div
                key={incident.id}
                onClick={() => navigate(`/incidents/${incident.id}`)}
                style={{
                  background: 'linear-gradient(135deg, #0d1526 0%, #0a0f1e 100%)',
                  border: '1px solid rgba(6, 182, 212, 0.1)',
                  borderLeft: `4px solid ${incident.priority === 'CRITICAL' ? '#f43f5e' : incident.priority === 'HIGH' ? '#fb923c' : incident.priority === 'MEDIUM' ? '#60a5fa' : '#10b981'}`,
                  borderRadius: '10px',
                  padding: '16px 20px',
                  marginBottom: '8px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  animation: 'fadeUp 0.4s ease both',
                  animationDelay: `${idx * 40}ms`,
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.1)'}
              >
                {/* Title & ID Left */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '50%' }}>
                  <span
                    title={mainTitle}
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      fontSize: '14px',
                      color: T.text,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {mainTitle}
                  </span>
                  {rawAlerts && (
                    <span
                      title={rawAlerts}
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '11px',
                        color: T.textMuted,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}
                    >
                      {rawAlerts}
                    </span>
                  )}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: T.textMuted }}>
                    {incident.id}
                  </span>
                </div>

                {/* Right side data items */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  {/* Priority Badge */}
                  <span style={{
                    background: `${prioColor}15`,
                    color: prioColor,
                    border: `1px solid ${prioColor}40`,
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-mono, monospace)'
                  }}>
                    {incident.priority}
                  </span>

                  {/* Status Badge */}
                  {incident.status === 'OPEN' ? (
                    <span style={{
                      background: 'rgba(251, 146, 60, 0.1)',
                      color: '#fb923c',
                      border: '1px solid rgba(251, 146, 60, 0.25)',
                      borderRadius: '4px',
                      padding: '2px 10px',
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.06em'
                    }}>OPEN</span>
                  ) : (
                    <span className="badge" style={statusStyles}>
                      {incident.status.replace(/_/g, ' ')}
                    </span>
                  )}

                  {/* Events count */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '70px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: T.textSecondary }}>Events</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: T.text }}>
                      {alertsCount}
                    </span>
                  </div>

                  {/* Date */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: T.textSecondary, minWidth: '130px' }}>
                    {formattedDate}
                  </span>

                  {/* Inspect Button */}
                  <button
                    className="btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/incidents/${incident.id}`);
                    }}
                  >
                    Inspect <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
