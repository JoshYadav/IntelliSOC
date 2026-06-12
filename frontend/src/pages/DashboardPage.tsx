import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import FileUpload from '../components/FileUpload';
import SummaryCards from '../components/SummaryCards';
import AlertsTable from '../components/AlertsTable';
import AnalyticsCharts from '../components/AnalyticsCharts';
import Filters from '../components/Filters';
import ErrorBoundary from '../components/ErrorBoundary';
import GeoIPMap from '../components/GeoIPMap';
import { COUNTRY_CENTERS } from '../components/worldMapCenters';
import KillChainTimeline from '../components/KillChainTimeline';
import CorrelationsTable from '../components/CorrelationsTable';
import { Download, Loader2, AlertCircle, RefreshCw, Sparkles, CheckCircle, Plus } from 'lucide-react';
import { getAlerts, getAnalytics, downloadReport, getSessions, getCorrelations, getAiSummary } from '../api/client';
import type { Alert, AnalyticsData, LogFormat, CorrelationData } from '../types';

const T = {
  bg:           "#080d16",       // page background
  surface:      "#0e1623",       // card / panel surface
  surfaceHover: "#121d2e",       // card hover state
  surfaceDeep:  "#060a10",       // inset / code block backgrounds
  border:       "rgba(255,255,255,0.06)",  // default subtle border
  primary:      "#818cf8",       // indigo-400 — primary accent
  primaryDim:   "rgba(129,140,248,0.12)", // primary tint for badges/hover
  critical:     "#fb7185",       // rose-400
  high:         "#fb923c",       // orange-400
  medium:       "#60a5fa",       // blue-400
  low:          "#34d399",       // emerald-400
  text:         "#f1f5f9",       // primary text — slate-100
  textSecondary:"#94a3b8",       // secondary text — slate-400
  textMuted:    "#475569",       // muted text — slate-600
};

export default function DashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [logsProcessed, setLogsProcessed] = useState(0);
  const [alertsGenerated, setAlertsGenerated] = useState(0);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [logFormat, setLogFormat] = useState<LogFormat>('UNKNOWN');
  
  const [correlations, setCorrelations] = useState<CorrelationData[]>([]);
  const [isCorrelationsLoading, setIsCorrelationsLoading] = useState(false);

  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  // Fetch alerts and analytics when session or filters change
  const fetchData = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
    setFetchError(null);
    try {
      const filters: { severity?: string; type?: string } = {};
      if (severityFilter !== 'ALL') filters.severity = severityFilter;
      if (typeFilter !== 'ALL') filters.type = typeFilter;

      const [alertsData, analyticsData] = await Promise.all([
        getAlerts(sessionId, filters),
        getAnalytics(sessionId),
      ]);

      setAlerts(alertsData);
      setAnalytics(analyticsData);
    } catch (err: any) {
      console.error('Failed to fetch data:', err);
      setFetchError(
        err?.response?.data?.error ??
        err?.message ??
        'Failed to load session data. The backend may be unreachable.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, severityFilter, typeFilter]);

  const fetchCorrelations = useCallback(async () => {
    setIsCorrelationsLoading(true);
    try {
      const data = await getCorrelations();
      setCorrelations(data);
    } catch (err) {
      console.error('Failed to fetch correlations:', err);
    } finally {
      setIsCorrelationsLoading(false);
    }
  }, []);

  // Sync session ID from URL search params
  useEffect(() => {
    const sessionParam = searchParams.get('session');
    if (sessionParam) {
      localStorage.setItem('intelliSOC_lastSession', sessionParam);
      setSessionId(sessionParam);
      getSessions().then(list => {
        const match = list.find(s => s.id === sessionParam);
        if (match) {
          setLogsProcessed(match._count?.logs ?? 0);
          setAlertsGenerated(match._count?.alerts ?? 0);
          setLogFormat(match.logFormat);
          setIncidentId(match.incidentId || null);
        }
      }).catch(err => {
        console.error('Failed to load session metadata:', err);
      });
    } else {
      const lastSession = localStorage.getItem('intelliSOC_lastSession');
      if (lastSession) {
        setSearchParams({ session: lastSession });
      }
    }
  }, [searchParams, setSearchParams]);

  // Fetch AI Summary when incidentId changes
  useEffect(() => {
    if (!incidentId) {
      setAiSummary(null);
      setAiError(null);
      return;
    }
    
    let isMounted = true;
    setIsAiLoading(true);
    setAiError(null);
    
    getAiSummary(incidentId, false)
      .then(summary => {
        if (isMounted) {
          setAiSummary(summary);
        }
      })
      .catch(err => {
        if (isMounted) {
          if (err.response?.status === 503) {
            setAiError('AI assessment unavailable: configure AI_API_KEY on the backend.');
          } else {
            console.error('Failed to fetch AI Summary:', err);
            setAiError(err.response?.data?.error || err.message || 'Failed to generate AI summary.');
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsAiLoading(false);
        }
      });
      
    return () => {
      isMounted = false;
    };
  }, [incidentId]);

  useEffect(() => {
    fetchData();
    if (sessionId) {
      fetchCorrelations();
    }
  }, [fetchData, fetchCorrelations, sessionId]);

  const handleUploadSuccess = (newSessionId: string, logs: number, alertCount: number, format: string, newIncidentId?: string | null) => {
    localStorage.setItem('intelliSOC_lastSession', newSessionId);
    setSearchParams({ session: newSessionId });
    setSessionId(newSessionId);
    setLogsProcessed(logs);
    setAlertsGenerated(alertCount);
    setLogFormat(format as LogFormat);
    setSeverityFilter('ALL');
    setTypeFilter('ALL');
    setIncidentId(newIncidentId || null);
  };

  const handleDownloadReport = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!sessionId) return;
    try {
      await downloadReport(sessionId);
    } catch (err) {
      console.error('Failed to download report:', err);
    }
  };

  // Group alerts to feed to the GeoIPMap component
  const attackers = (() => {
    const groups: Record<string, { count: number; riskScore: number; lat: number | null; lng: number | null }> = {};
    for (const alert of alerts) {
      const country = alert.country;
      if (!country || country === 'null') continue;
      const cc = country.toUpperCase();
      if (cc === 'US') continue;

      if (!groups[cc]) {
        groups[cc] = { count: 0, riskScore: 0, lat: null, lng: null };
      }
      groups[cc].count += alert.count;
      groups[cc].riskScore = Math.max(groups[cc].riskScore, alert.riskScore);

      if (alert.latitude !== null && alert.latitude !== undefined &&
          alert.longitude !== null && alert.longitude !== undefined) {
        groups[cc].lat = alert.latitude;
        groups[cc].lng = alert.longitude;
      }
    }

    return Object.entries(groups).map(([country, group]) => {
      let lat = group.lat;
      let lng = group.lng;
      if (lat === null || lng === null) {
        const center = COUNTRY_CENTERS[country];
        if (center) {
          lat = center.lat;
          lng = center.lng;
        }
      }
      return {
        country,
        count: group.count,
        riskScore: group.riskScore,
        lat: lat ?? 0,
        lng: lng ?? 0,
      };
    }).filter(att => att.lat !== 0 || att.lng !== 0);
  })();

  // Severity metrics calculation for AI assessment card
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').reduce((sum, a) => sum + a.count, 0);
  const highCount = alerts.filter(a => a.severity === 'HIGH').reduce((sum, a) => sum + a.count, 0);
  const mediumCount = alerts.filter(a => a.severity === 'MEDIUM').reduce((sum, a) => sum + a.count, 0);
  const lowCount = alerts.filter(a => a.severity === 'LOW').reduce((sum, a) => sum + a.count, 0);
  const totalSeverityCount = (criticalCount + highCount + mediumCount + lowCount) || 1;

  const severityBars = [
    { label: 'Critical', count: criticalCount, color: T.critical, pct: (criticalCount / totalSeverityCount) * 100 },
    { label: 'High', count: highCount, color: T.high, pct: (highCount / totalSeverityCount) * 100 },
    { label: 'Medium', count: mediumCount, color: T.medium, pct: (mediumCount / totalSeverityCount) * 100 },
    { label: 'Low', count: lowCount, color: T.low, pct: (lowCount / totalSeverityCount) * 100 },
  ];

  // AI Summary sub-sections parser
  const parsedAi = (() => {
    if (!aiSummary) return null;
    const summaryMatch = aiSummary.match(/SUMMARY:\s*([\s\S]*?)(?=OBJECTIVE:|$)/i);
    const objectiveMatch = aiSummary.match(/OBJECTIVE:\s*([\s\S]*?)(?=ACTIONS:|$)/i);
    const actionsMatch = aiSummary.match(/ACTIONS:\s*([\s\S]*)$/i);
    
    return {
      summary: summaryMatch ? summaryMatch[1].trim() : aiSummary,
      objective: objectiveMatch ? objectiveMatch[1].trim() : 'No active attacker objectives identified.',
      checklist: actionsMatch ? actionsMatch[1].trim() : 'No recommended operations required.',
    };
  })();

  const sectionHeaderStyle = (title: string, badge?: string) => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      marginBottom: '1.5rem',
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
        {title}
      </h2>
      {badge && (
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '11px',
          background: T.primaryDim,
          color: T.primary,
          padding: '2px 8px',
          borderRadius: '6px',
        }}>
          {badge}
        </span>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Session Toolbar */}
      {sessionId && (
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          padding: '16px 24px',
          borderRadius: '16px',
          background: T.surface,
          border: `1px solid ${T.border}`,
        }}>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span className="badge" style={{
              background: T.primaryDim,
              border: `1px solid ${T.primary}`,
              color: T.primary,
            }}>
              session completed
            </span>
            {logFormat !== 'UNKNOWN' && (
              <span className="badge" style={{
                background: T.primaryDim,
                border: `1px solid ${T.primary}`,
                color: T.primary,
              }}>
                {logFormat.replace(/_/g, ' ')}
              </span>
            )}
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              color: T.textSecondary,
            }}>
              ID: {sessionId.substring(0, 8)}...
            </span>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => {
                localStorage.removeItem('intelliSOC_lastSession');
                setSearchParams({});
                setSessionId(null);
              }}
              style={{
                background: 'transparent',
                border: `1px solid ${T.border}`,
                color: T.textSecondary,
                borderRadius: '8px',
                padding: '8px 16px',
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = T.primary;
                e.currentTarget.style.color = T.text;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = T.border;
                e.currentTarget.style.color = T.textSecondary;
              }}
            >
              <Plus size={14} /> New Log
            </button>
            <button
              id="download-report-btn"
              onClick={handleDownloadReport}
              style={{
                background: T.primaryDim,
                border: `1px solid ${T.primary}`,
                color: T.primary,
                borderRadius: '8px',
                padding: '8px 16px',
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(129,140,248,0.2)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = T.primaryDim}
            >
              <Download size={14} /> Export SigInt
            </button>
          </div>
        </div>
      )}

      {/* Section 1 — Ingestion zone (Upload is at top before data is loaded) */}
      {!sessionId && <FileUpload onUploadSuccess={handleUploadSuccess} />}

      {/* Dashboard Content stacked vertically (separated by 48px / 3rem of space) */}
      {sessionId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          
          {/* Fetch error banner */}
          {fetchError && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 20px',
                borderRadius: '12px',
                background: 'rgba(251, 113, 133, 0.08)',
                border: `1px solid rgba(251, 113, 133, 0.25)`,
                color: T.critical,
                fontFamily: 'var(--font-display)',
                fontSize: '14px',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span style={{ flex: 1 }}>Error: {fetchError}</span>
              <button
                id="fetch-error-retry-btn"
                onClick={() => fetchData()}
                style={{
                  background: 'none',
                  border: `1px solid ${T.critical}`,
                  borderRadius: '6px',
                  padding: '4px 10px',
                  color: T.critical,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                }}
              >
                <RefreshCw size={10} /> Retry
              </button>
            </div>
          )}

          {/* Section 2 — Hero metric strip (6 cards) */}
          <ErrorBoundary>
            <SummaryCards
              analytics={analytics}
              logsProcessed={logsProcessed}
              alertsGenerated={alertsGenerated}
            />
          </ErrorBoundary>

          {/* Section 3 — AI Security Assessment */}
          <div className="op-card" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Gemini Sparkle Badge (subtly placed top-right) */}
            <div style={{
              position: 'absolute',
              top: '24px',
              right: '24px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-display)',
              fontSize: '11px',
              fontWeight: 500,
              color: T.textMuted
            }}>
              <Sparkles size={12} style={{ color: T.primary }} />
              SecOps Copilot
            </div>

            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 600,
              color: T.text,
              marginBottom: '20px',
            }}>
              Security Assessment
            </h3>

            {isAiLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 0', gap: '0.75rem' }}>
                <Loader2 size={24} style={{ color: T.primary }} className="animate-spin" />
                <span style={{ fontSize: '13px', fontFamily: 'var(--font-display)', color: T.textSecondary }}>
                  Synthesizing security metadata...
                </span>
              </div>
            ) : aiError ? (
              <div style={{
                fontSize: '13px',
                fontFamily: 'var(--font-display)',
                color: T.critical,
                background: 'rgba(251, 113, 133, 0.04)',
                border: `1px solid rgba(251, 113, 133, 0.15)`,
                padding: '12px 16px',
                borderRadius: '8px',
              }}>
                Intel compilation error: {aiError}
              </div>
            ) : parsedAi ? (
              <div style={{ display: 'flex', gap: '32px' }}>
                {/* Left Side (60% width) */}
                <div style={{ width: '60%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Executive Summary */}
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '12px', color: T.primary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                      Executive Summary
                    </div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: T.text, lineHeight: 1.7 }}>
                      {parsedAi.summary}
                    </p>
                  </div>

                  {/* Attacker Objective */}
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '12px', color: T.primary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                      Attacker Objective
                    </div>
                    <p style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: T.text, lineHeight: 1.7 }}>
                      {parsedAi.objective}
                    </p>
                  </div>

                  {/* Response Checklist */}
                  <div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '12px', color: T.primary, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                      Response Checklist
                    </div>
                    {parsedAi.checklist.includes('\n') ? (
                      <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {parsedAi.checklist.split('\n').map((line, idx) => (
                          <li key={idx} style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: T.text, lineHeight: 1.7 }}>
                            {line.replace(/^\d+\.\s*/, '').trim()}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ fontFamily: 'var(--font-display)', fontSize: '15px', color: T.text, lineHeight: 1.7 }}>
                        {parsedAi.checklist}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Side (40% width) - Compact Severity Breakdown */}
                <div style={{ width: '40%', display: 'flex', flexDirection: 'column', justifyContent: 'center', borderLeft: `1px solid ${T.border}`, paddingLeft: '32px' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '13px', color: T.textSecondary, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Severity Distribution
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {severityBars.map(bar => (
                      <div key={bar.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                          <span style={{ color: T.textSecondary }}>{bar.label}</span>
                          <span style={{ fontWeight: 600, color: bar.color }}>{bar.count}</span>
                        </div>
                        <div style={{ height: '6px', background: T.surfaceDeep, borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${bar.pct}%`, height: '100%', background: bar.color, borderRadius: '3px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: T.low, background: T.primaryDim, border: `1px solid rgba(52, 211, 153, 0.15)`, padding: '16px', borderRadius: '12px' }}>
                <CheckCircle size={16} />
                <span>No active threats detected. System logs reflect standard telemetry operations.</span>
              </div>
            )}
          </div>

          {/* Section 4 — Threat Analytics */}
          <div>
            {sectionHeaderStyle("Threat Analytics")}
            <ErrorBoundary>
              <AnalyticsCharts analytics={analytics} alerts={alerts} />
            </ErrorBoundary>
          </div>

          {/* Section 5 — Vector Geolocation Map */}
          <div>
            <GeoIPMap
              attackers={attackers}
              socCore={{ lat: 37, lng: -95 }}
              alerts={alerts}
              logsProcessed={logsProcessed}
            />
          </div>

          {/* Section 6 — System Detections */}
          <div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              {sectionHeaderStyle("System Detections", `${alerts.length} matched`)}
              
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Filters
                  severityFilter={severityFilter}
                  typeFilter={typeFilter}
                  onSeverityChange={setSeverityFilter}
                  onTypeChange={setTypeFilter}
                />
                
                <button
                  id="export-csv-btn"
                  onClick={handleDownloadReport}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${T.border}`,
                    color: T.textSecondary,
                    borderRadius: '8px',
                    padding: '8px 16px',
                    height: '40px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 500,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = T.primary;
                    e.currentTarget.style.color = T.text;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = T.border;
                    e.currentTarget.style.color = T.textSecondary;
                  }}
                >
                  ↓ Export CSV
                </button>
              </div>
            </div>

            {isLoading ? (
              <div style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: '16px',
                padding: '4rem',
                textAlign: 'center',
                color: T.textSecondary,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}>
                <Loader2 size={32} style={{ color: T.primary }} className="animate-spin" />
                <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px' }}>Refreshing detections queue...</p>
              </div>
            ) : (
              <ErrorBoundary>
                <AlertsTable alerts={alerts} />
              </ErrorBoundary>
            )}
          </div>

          {/* Section 7 — MITRE ATT&CK Intrusion Timeline */}
          <div>
            {sectionHeaderStyle("MITRE ATT&CK Intrusion Timeline")}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '16px', padding: '24px' }}>
              <p style={{ fontSize: '14px', color: T.textSecondary, marginBottom: '20px', fontFamily: 'var(--font-display)' }}>
                Active kill-chain distribution representing chronological execution flows of attacker components.
              </p>
              <KillChainTimeline alerts={alerts} />
            </div>
          </div>

          {/* Section 8 — Attacker Correlations */}
          <div>
            {sectionHeaderStyle("Attacker Correlations")}
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: '16px', padding: '24px' }}>
              <CorrelationsTable
                correlations={correlations}
                isLoading={isCorrelationsLoading}
                onRefresh={fetchCorrelations}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
