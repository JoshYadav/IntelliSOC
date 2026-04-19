import { useState, useEffect, useCallback } from 'react';
import './App.css';
import FileUpload from './components/FileUpload';
import SummaryCards from './components/SummaryCards';
import AlertsTable from './components/AlertsTable';
import AnalyticsCharts from './components/AnalyticsCharts';
import Filters from './components/Filters';
import { Shield, Download, Activity, Search, Loader2 } from 'lucide-react';
import { getAlerts, getAnalytics, downloadReport } from './api/client';
import type { Alert, AnalyticsData } from './types';

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [logsProcessed, setLogsProcessed] = useState(0);
  const [alertsGenerated, setAlertsGenerated] = useState(0);
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch alerts and analytics when session or filters change
  const fetchData = useCallback(async () => {
    if (!sessionId) return;
    setIsLoading(true);
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
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, severityFilter, typeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUploadSuccess = (newSessionId: string, logs: number, alertCount: number) => {
    setSessionId(newSessionId);
    setLogsProcessed(logs);
    setAlertsGenerated(alertCount);
    setSeverityFilter('ALL');
    setTypeFilter('ALL');
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

  return (
    <div style={{
      maxWidth: '1400px',
      margin: '0 auto',
      padding: '2rem 1.5rem',
    }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ flex: 1 }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: 900,
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--gradient-primary)',
              color: '#fff',
            }}>
              <Shield size={24} />
            </span>
            <span className="gradient-text">IntelliSOC</span>
          </h1>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginTop: '0.25rem',
            marginLeft: '3.25rem',
          }}>
            <p style={{
              fontSize: '0.9rem',
              color: 'var(--color-text-secondary)',
            }}>
              Log-Based Cyber Attack Detection System
            </p>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              color: 'var(--color-accent-emerald)',
              fontSize: '0.75rem',
              fontWeight: 600,
              letterSpacing: '0.02em',
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: 'var(--color-accent-emerald)',
                animation: 'pulseGlow 2s infinite',
              }} />
              System Active
            </span>
          </div>
        </div>

        {sessionId && (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              color: 'var(--color-accent-blue)',
              fontSize: '0.78rem',
              fontWeight: 500,
            }}>
              <Activity size={14} className="pulse-glow" />
              Session Analyzed
            </span>
            <button
              id="download-report-btn"
              onClick={handleDownloadReport}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--color-border)',
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-primary)',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all var(--transition-base)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent-blue)';
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.background = 'var(--color-bg-card)';
              }}
            >
              <Download size={16} /> Download Report
            </button>
          </div>
        )}
      </header>

      {/* File Upload */}
      <FileUpload onUploadSuccess={handleUploadSuccess} />

      {/* Dashboard Content (visible after upload) */}
      {sessionId && (
        <>
          {/* Summary Cards */}
          <SummaryCards
            analytics={analytics}
            logsProcessed={logsProcessed}
            alertsGenerated={alertsGenerated}
          />

          {/* Analytics Charts */}
          <AnalyticsCharts analytics={analytics} />

          {/* Alerts Section */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1rem',
              flexWrap: 'wrap',
              gap: '1rem',
            }}>
              <h2 style={{
                fontSize: '1.15rem',
                fontWeight: 700,
                color: 'var(--color-text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                🚨 Threat Alerts
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: 'var(--color-accent-blue)',
                }}>
                  {alerts.length} results
                </span>
              </h2>

              <Filters
                severityFilter={severityFilter}
                typeFilter={typeFilter}
                onSeverityChange={setSeverityFilter}
                onTypeChange={setTypeFilter}
              />
            </div>

            {isLoading ? (
              <div className="glass-card" style={{
                padding: '4rem',
                textAlign: 'center',
                color: 'var(--color-text-muted)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '1rem',
              }}>
                <Loader2 size={32} color="var(--color-accent-blue)" style={{ animation: 'spin 1s linear infinite' }} />
                <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>Analyzing threats...</p>
              </div>
            ) : (
              <AlertsTable alerts={alerts} />
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!sessionId && (
        <div style={{
          textAlign: 'center',
          padding: '5rem 2rem',
          color: 'var(--color-text-muted)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}>
          <div style={{
            marginBottom: '1.5rem',
            opacity: 0.6,
            color: 'var(--color-text-secondary)'
          }}>
            <Search size={64} strokeWidth={1.5} />
          </div>
          <h2 style={{
            fontSize: '1.3rem',
            fontWeight: 600,
            color: 'var(--color-text-secondary)',
            marginBottom: '0.5rem',
          }}>
            Upload a log file to begin analysis
          </h2>
          <p style={{ fontSize: '0.9rem', maxWidth: '450px', margin: '0 auto', lineHeight: 1.6 }}>
            Drop your system logs above to detect brute force attacks,
            account compromises, and other cyber threats in real time.
          </p>
        </div>
      )}
    </div>
  );
}

export default App;
