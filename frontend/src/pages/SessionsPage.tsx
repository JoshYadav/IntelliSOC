import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSessions } from '../api/client';
import type { Session } from '../types';
import { RefreshCw, Loader2 } from 'lucide-react';

const T = {
  bg:           "#080d16",       // page background
  surface:      "#0e1623",       // card / panel surface
  surfaceHover: "#121d2e",       // card hover state
  surfaceDeep:  "#060a10",       // inset / code block backgrounds
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

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchSessions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getSessions();
      setSessions(data);
    } catch (err: any) {
      console.error('Failed to load sessions:', err);
      setError(err?.response?.data?.error ?? err?.message ?? 'Failed to load sessions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const totalLogs = sessions.reduce((s, sess) => s + (sess._count?.logs ?? 0), 0);
  const totalAlerts = sessions.reduce((s, sess) => s + (sess._count?.alerts ?? 0), 0);
  const formats = new Set(sessions.map(s => s.logFormat));

  const cards = [
    { label: 'Total Sessions', value: sessions.length, color: T.text },
    { label: 'Logs Ingested', value: totalLogs.toLocaleString(), color: T.text },
    { label: 'Total Detections', value: totalAlerts, color: totalAlerts > 0 ? T.critical : T.text },
    { label: 'Format Signatures', value: formats.size, color: T.text },
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

      {/* Actions and Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          paddingLeft: '12px',
          borderLeft: `4px solid ${T.primary}`
        }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '20px',
            fontWeight: 600,
            color: T.text,
            textTransform: 'none',
          }}>
            Sessions Archive
          </h2>
        </div>
        <button
          className="btn-secondary"
          onClick={fetchSessions}
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

      {/* Session Entry List */}
      {isLoading ? (
        <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: T.textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Loader2 size={24} style={{ color: T.primary }} className="animate-spin" />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px' }}>Loading session archive...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '4rem 1.5rem',
          color: T.textSecondary,
          border: `1px dashed ${T.border}`,
          borderRadius: '16px',
          background: T.surface,
        }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, color: T.text, marginBottom: '8px' }}>
            No sessions present
          </h3>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px', maxWidth: '380px', margin: '0 auto', lineHeight: 1.5 }}>
            No log history matches existing indexes. Process a log file on the main Dashboard view.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sessions.map((session, idx) => {
            const logsCount = session._count?.logs ?? 0;
            const alertsCount = session._count?.alerts ?? 0;
            const formattedDate = new Date(session.createdAt).toLocaleDateString() + ' ' + 
              new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

            return (
              <div
                key={session.id}
                className="card-premium"
                onClick={() => navigate(`/?session=${session.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  border: `1px solid ${T.border}`,
                  borderLeft: alertsCount > 0 ? '3px solid #fb7185' : '3px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  animation: 'fadeUp 0.4s ease both',
                  animationDelay: `${idx * 40}ms`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = T.border;
                }}
              >
                {/* File info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: T.text }}>
                    {session.fileName}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: T.textMuted }}>
                    {session.id}
                  </span>
                </div>

                {/* Format pill */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                  <span className="badge" style={{ background: T.primaryDim, color: T.primary, borderColor: T.primary }}>
                    {session.logFormat.replace(/_/g, ' ')}
                  </span>

                  {/* Total logs */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: '80px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: T.textSecondary }}>Total Logs</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: T.text }}>
                      {logsCount.toLocaleString()}
                    </span>
                  </div>

                  {/* Detections badge */}
                  <div style={{ minWidth: '90px' }}>
                    {alertsCount > 0 ? (
                      <span style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)', boxShadow: '0 0 8px rgba(244,63,94,0.2)', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                        △ {alertsCount}
                      </span>
                    ) : (
                      <span className="badge badge--low">
                        CLEAN
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: T.textSecondary, minWidth: '130px' }}>
                    {formattedDate}
                  </span>

                  {/* Open Console Button */}
                  <button
                    className="btn-secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/?session=${session.id}`);
                    }}
                  >
                    Open Console
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
