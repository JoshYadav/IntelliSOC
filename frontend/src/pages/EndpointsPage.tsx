import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getEndpoints, isolateHost, unisolateHost } from '../api/client';
import type { Endpoint } from '../types';
import {
  Search,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  ShieldAlert,
  Clipboard
} from 'lucide-react';

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

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).catch(() => {});
  window.dispatchEvent(new CustomEvent('show-toast', { detail: `Copied IP ${text} to clipboard` }));
};

export default function EndpointsPage() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const navigate = useNavigate();

  const fetchEndpoints = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getEndpoints();
      setEndpoints(data);
    } catch (err: any) {
      console.error('Failed to load endpoints:', err);
      setError(
        err?.response?.data?.error ??
        err?.message ??
        'Failed to fetch endpoints. Please ensure the EDR backend is active.'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEndpoints();
  }, [fetchEndpoints]);

  // Isolate/Unisolate Action Handler
  const handleToggleIsolation = async (endpoint: Endpoint) => {
    setActionLoadingId(endpoint.id);
    setError(null);
    try {
      if (endpoint.status === 'ISOLATED') {
        const updated = await unisolateHost(endpoint.id);
        setEndpoints(prev => prev.map(e => e.id === endpoint.id ? { ...e, status: updated.status } : e));
      } else {
        const updated = await isolateHost(endpoint.id);
        setEndpoints(prev => prev.map(e => e.id === endpoint.id ? { ...e, status: updated.status } : e));
      }
    } catch (err: any) {
      console.error('Failed to update isolation status:', err);
      setError(err?.response?.data?.error ?? err?.message ?? 'Failed to toggle isolation status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Helper: Format relative time
  const formatLastSeen = (dateString: string) => {
    const lastSeenDate = new Date(dateString);
    const diffMs = Date.now() - lastSeenDate.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 15) return 'JUST NOW';
    if (diffSecs < 60) return `${diffSecs}S AGO`;
    if (diffMins < 60) return `${diffMins}M AGO`;
    if (diffHours < 24) return `${diffHours}H AGO`;
    return lastSeenDate.toLocaleDateString();
  };

  // Metrics derivation
  const totalCount = endpoints.length;
  const onlineCount = endpoints.filter(e => e.status === 'ONLINE').length;
  const offlineCount = endpoints.filter(e => e.status === 'OFFLINE').length;
  const isolatedCount = endpoints.filter(e => e.status === 'ISOLATED').length;

  // Filter endpoints
  const filteredEndpoints = endpoints.filter(ep => {
    const matchesSearch = ep.hostname.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ep.ip && ep.ip.includes(searchQuery)) ||
      (ep.os && ep.os.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || ep.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const statCards = [
    { label: 'Registered Hosts', value: totalCount, color: T.text },
    { label: 'Active Online', value: onlineCount, color: T.text },
    { label: 'Offline Hosts', value: offlineCount, color: T.text },
    { label: 'Quarantined', value: isolatedCount, color: isolatedCount > 0 ? T.critical : T.text },
  ];

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: '1400px', margin: '0 auto', animation: 'fadeUp 0.4s ease both' }}>
      
      {/* Metrics Cards */}
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
            {/* Large Number */}
            <div style={{
              fontSize: '2.2rem',
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace",
              color: card.color || '#e2e8f0',
              marginBottom: '8px',
            }}>
              {card.value}
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

      {/* Control bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem',
        marginBottom: '2rem',
      }}>
        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', flex: 1, maxWidth: '600px' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: T.textSecondary }} />
            <input
              type="text"
              placeholder="Search hostname, IP, platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="op-input"
              style={{
                width: '100%',
                paddingLeft: '2.2rem',
                height: '40px',
                fontSize: 'var(--text-sm)',
                borderRadius: '8px',
                fontFamily: 'var(--font-display)',
              }}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="op-select"
            style={{ minWidth: '160px', height: '40px', fontSize: 'var(--text-sm)', borderRadius: '8px' }}
          >
            <option value="ALL">Host Status: All</option>
            <option value="ONLINE">Status: Online</option>
            <option value="OFFLINE">Status: Offline</option>
            <option value="ISOLATED">Status: Isolated</option>
          </select>
        </div>

        {/* Actions */}
        <button
          onClick={fetchEndpoints}
          disabled={isLoading}
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
            if (!isLoading) e.currentTarget.style.backgroundColor = T.primaryGlow;
          }}
          onMouseLeave={(e) => {
            if (!isLoading) e.currentTarget.style.backgroundColor = T.primaryDim;
          }}
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh Inventory
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div role="alert" style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          padding: '1rem 1.25rem', marginBottom: '2rem', borderRadius: '12px',
          background: 'rgba(251, 113, 133, 0.06)', border: '1px solid rgba(251, 113, 133, 0.2)',
          color: T.critical, fontSize: 'var(--text-sm)', fontFamily: 'var(--font-display)',
        }}>
          <AlertTriangle size={16} />
          <span>Error: {error}</span>
        </div>
      )}

      {/* Main Table Content */}
      {isLoading ? (
        <div className="op-card" style={{ padding: '4rem 2rem', textAlign: 'center', color: T.textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Loader2 size={32} style={{ color: T.primary, animation: 'spin 1s linear infinite' }} />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)' }}>Loading endpoint data...</p>
        </div>
      ) : filteredEndpoints.length === 0 ? (
        <div className="op-card" style={{ textAlign: 'center', padding: '5rem 2rem', color: T.textSecondary }}>
          <ShieldAlert size={48} style={{ marginBottom: '1.25rem', opacity: 0.4, color: T.textSecondary, margin: '0 auto 1.25rem auto' }} />
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600, color: T.text, marginBottom: '0.5rem' }}>
            No Endpoints Registered
          </h3>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', maxWidth: '400px', margin: '0 auto', lineHeight: 1.5 }}>
            Verify EDR system agent status. No matching endpoint records were found in the active segment.
          </p>
        </div>
      ) : (
        <div className="op-card" style={{ overflow: 'hidden', padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table-premium" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Hostname</th>
                  <th style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>IP address</th>
                  <th style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Os / platform</th>
                  <th style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Status</th>
                  <th style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Last contact</th>
                  <th style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Active threats</th>
                  <th style={{ padding: '16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)', textAlign: 'right' }}>EDR operations</th>
                </tr>
              </thead>
              <tbody>
                {filteredEndpoints.map((ep) => {
                  const threats = ep.alertCount ?? 0;
                  const isActionLoading = actionLoadingId === ep.id;

                  // Status style mappings
                  let statusBadge = (
                    <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 0 8px rgba(16,185,129,0.2)' }}>
                      ONLINE
                    </span>
                  );
                  if (ep.status === 'OFFLINE') {
                    statusBadge = (
                      <span className="badge" style={{ background: 'rgba(100,116,139,0.1)', color: '#64748b', border: '1px solid rgba(100,116,139,0.2)' }}>
                        OFFLINE
                      </span>
                    );
                  } else if (ep.status === 'ISOLATED') {
                    statusBadge = (
                      <span className="badge badge-critical" style={{ background: T.criticalDim, color: T.critical, borderColor: 'rgba(251, 113, 133, 0.25)' }}>
                        <Lock size={10} style={{ marginRight: '4px', display: 'inline' }} />
                        ISOLATED
                      </span>
                    );
                  }

                  return (
                    <tr
                      key={ep.id}
                      onClick={() => navigate(`/endpoints/${ep.id}`)}
                      style={{ cursor: 'pointer', borderBottom: `1px solid ${T.border}`, transition: 'background-color 0.15s ease' }}
                      className="endpoint-row"
                    >
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: T.text, fontFamily: 'var(--font-display)' }}>
                          {ep.hostname}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: T.textMuted, fontFamily: 'var(--font-display)', marginTop: '2px' }}>
                          agent v{ep.agentVersion ?? '1.0.0'}
                        </div>
                      </td>
                      <td style={{ padding: '16px', fontSize: '13px', color: T.dataText, fontFamily: 'var(--font-mono)' }}>
                        {ep.ip ? (
                          <span className="copy-ip-container" onClick={(e) => { e.stopPropagation(); copyToClipboard(ep.ip || ''); }} title="Click to copy IP">
                            <span>{ep.ip}</span>
                            <Clipboard size={12} className="copy-ip-icon" />
                          </span>
                        ) : (
                          '0.0.0.0'
                        )}
                      </td>
                      <td style={{ padding: '16px', fontSize: 'var(--text-sm)', color: T.textSecondary, fontFamily: 'var(--font-display)' }}>
                        {(ep.os || 'Unknown').charAt(0).toUpperCase() + (ep.os || 'unknown').slice(1).toLowerCase()}
                      </td>
                      <td style={{ padding: '16px' }}>
                        {statusBadge}
                      </td>
                      <td style={{ padding: '16px', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-display)', color: T.textSecondary }}>
                        {formatLastSeen(ep.lastSeen).toLowerCase()}
                      </td>
                      <td style={{ padding: '16px' }}>
                        {threats > 0 ? (
                          <span className="badge badge-critical">
                            △ {threats}
                          </span>
                        ) : (
                          <span className="badge" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.25)' }}>
                            CLEAN
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn-primary"
                            onClick={() => handleToggleIsolation(ep)}
                            disabled={isActionLoading}
                            style={{
                              background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                              border: 'none',
                              color: '#fff',
                            }}
                          >
                            {isActionLoading ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : ep.status === 'ISOLATED' ? (
                              <>
                                <Unlock size={12} />
                                Unisolate
                              </>
                            ) : (
                              <>
                                <Lock size={12} />
                                Isolate
                              </>
                            )}
                          </button>

                          <button
                            className="btn-secondary"
                            onClick={() => navigate(`/endpoints/${ep.id}`)}
                          >
                            <Eye size={12} /> Profile
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{
            textAlign: 'center',
            padding: '16px',
            fontFamily: 'Inter, var(--font-display)',
            fontWeight: 400,
            fontSize: '12px',
            color: T.textMuted,
            borderTop: `1px solid ${T.border}`
          }}>
            Showing {filteredEndpoints.length} of {endpoints.length} registered hosts
          </div>
        </div>
      )}
    </div>
  );
}
