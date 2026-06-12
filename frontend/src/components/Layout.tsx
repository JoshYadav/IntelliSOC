import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  Shield, ChevronRight, Menu
} from 'lucide-react';
import logoSrc from '../assets/logo.svg';

// Design tokens mapping
const T = {
  bg:           "#080d16",       // page background
  surface:      "#0e1623",       // card / panel surface
  surfaceHover: "#121d2e",       // card hover state
  surfaceDeep:  "#060a10",       // inset / code block backgrounds
  border:       "rgba(255,255,255,0.06)",  // default subtle border
  borderHover:  "rgba(255,255,255,0.11)",  // hover border
  primary:      "#818cf8",       // indigo-400 — primary accent
  primaryDim:   "rgba(129,140,248,0.12)", // primary tint for badges/hover
  primaryGlow:  "rgba(129,140,248,0.2)",  // glow for active states
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

export default function Layout() {
  const location = useLocation();
  const [clock, setClock] = useState(getTimeString());
  const [uptimeSeconds, setUptimeSeconds] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setToast(customEvent.detail);
    };
    window.addEventListener('show-toast', handleToast);
    return () => window.removeEventListener('show-toast', handleToast);
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const path = location.pathname;
    let currentPage = 'dashboard';
    if (path === '/sessions') currentPage = 'sessions';
    else if (path === '/incidents' || path.startsWith('/incidents/')) currentPage = 'incidents';
    else if (path === '/playbooks') currentPage = 'playbooks';
    else if (path === '/endpoints' || path.startsWith('/endpoints/')) currentPage = 'endpoints';

    const titles: Record<string, string> = {
      dashboard:    "Dashboard — IntelliSOC",
      sessions:     "Sessions — IntelliSOC",
      incidents:    "Incidents — IntelliSOC",
      playbooks:    "Playbooks — IntelliSOC",
      endpoints:    "Endpoints — IntelliSOC",
    };
    document.title = titles[currentPage] || "IntelliSOC";
  }, [location.pathname]);

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(getTimeString());
      setUptimeSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getPageBreadcrumb = () => {
    const path = location.pathname;
    if (path === '/') return 'siem > dashboard';
    if (path === '/sessions') return 'siem > sessions';
    if (path === '/incidents') return 'soar > incidents';
    if (path.startsWith('/incidents/')) return 'soar > incident investigation';
    if (path === '/playbooks') return 'soar > playbooks';
    if (path === '/endpoints') return 'edr > endpoints';
    if (path.startsWith('/endpoints/')) return 'edr > host investigation';
    return 'console';
  };

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '0 0.75rem',
    height: '100%',
    fontFamily: 'var(--font-display)',
    fontSize: '14px',
    fontWeight: 500,
    color: isActive ? '#06b6d4' : T.textSecondary,
    borderBottom: isActive ? 'none' : '2px solid transparent',
    backgroundImage: isActive ? 'linear-gradient(90deg, #06b6d4, #3b82f6)' : 'none',
    backgroundSize: '100% 2px',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'bottom',
    textDecoration: 'none',
    transition: 'color 0.15s ease, background-size 0.15s ease',
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: T.bg,
      color: T.text,
      overflow: 'hidden',
    }}>

      {/* ══════════ TOP NAVIGATION BAR (56px) ══════════ */}
      <header style={{
        height: '56px',
        minHeight: '56px',
        background: 'rgba(3, 7, 18, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(6, 182, 212, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        {/* Left: Logo and Sidebar Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img src={logoSrc} width={28} height={28} alt="IntelliSOC" />
            <div>
              <div style={{ fontFamily: "Inter", fontWeight: 600, fontSize: 15, color: "#f1f5f9", lineHeight: 1.2 }}>
                IntelliSOC
              </div>
              <div style={{ fontFamily: "Inter", fontWeight: 400, fontSize: 11, color: "#475569", lineHeight: 1.2 }}>
                operator console
              </div>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              color: T.textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '6px',
              borderRadius: '6px',
              transition: 'background-color 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = T.surfaceHover;
              e.currentTarget.style.color = T.text;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = T.textSecondary;
            }}
            title={sidebarOpen ? "Collapse threat feed" : "Expand threat feed"}
          >
            <Menu size={16} />
          </button>
        </div>

        {/* Center: Navigation links */}
        <nav style={{
          display: 'flex',
          alignItems: 'stretch',
          height: '100%',
          gap: '0.5rem',
        }}>
          {/* SIEM group */}
          <span style={{
            fontSize: '14px',
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            color: T.textMuted,
            display: 'flex',
            alignItems: 'center',
            padding: '0 0.5rem'
          }}>
            SIEM
          </span>
          <NavLink to="/" end style={linkStyle}>
            Dashboard
          </NavLink>
          <NavLink to="/sessions" style={linkStyle}>
            Sessions
          </NavLink>

          <div style={{ width: '1px', background: T.border, margin: '12px 8px' }} />

          {/* SOAR group */}
          <span style={{
            fontSize: '14px',
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            color: T.textMuted,
            display: 'flex',
            alignItems: 'center',
            padding: '0 0.5rem'
          }}>
            SOAR
          </span>
          <NavLink to="/incidents" style={linkStyle}>
            Incidents
          </NavLink>
          <NavLink to="/playbooks" style={linkStyle}>
            Playbooks
          </NavLink>

          <div style={{ width: '1px', background: T.border, margin: '12px 8px' }} />

          {/* EDR group */}
          <span style={{
            fontSize: '14px',
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            color: T.textMuted,
            display: 'flex',
            alignItems: 'center',
            padding: '0 0.5rem'
          }}>
            EDR
          </span>
          <NavLink to="/endpoints" style={linkStyle}>
            Endpoints
          </NavLink>
        </nav>

        {/* Right: Live status dot + timestamp */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontFamily: 'var(--font-display)',
            fontSize: '13px',
            color: T.textSecondary,
          }}>
            <span className="pulse-glow" style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#10b981',
              display: 'inline-block',
              boxShadow: '0 0 8px #10b981',
              animation: 'pulse-glow 2s ease infinite',
            }} />
            live
          </div>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            color: T.textSecondary,
          }}>
            {clock}
          </span>
        </div>
      </header>

      {/* ══════════ MAIN BODY ══════════ */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* ── Left Sidebar (Threat Feed) ── */}
        <div style={{
          width: sidebarOpen ? '280px' : '0px',
          minWidth: sidebarOpen ? '280px' : '0px',
          overflow: 'hidden',
          transition: 'width 0.2s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'rgba(7, 9, 26, 0.95)',
          borderRight: sidebarOpen ? '1px solid rgba(6, 182, 212, 0.07)' : 'none',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <ThreatFeedPanel />
        </div>

        {/* ── Main Content Area ── */}
        <main style={{
          flex: 1,
          padding: '2.5rem', // spacious whitespace
          overflowY: 'auto',
          overflowX: 'hidden',
          background: T.bg,
        }}>
          {/* Breadcrumb (lowercase, clean) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginBottom: '1.5rem',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--text-xs)',
            color: T.textMuted,
          }}>
            <Shield size={12} style={{ color: T.primary }} />
            <ChevronRight size={10} />
            <span>{getPageBreadcrumb()}</span>
          </div>

          <Outlet />
        </main>
      </div>

      {/* ══════════ STATUS BAR (32px) ══════════ */}
      <footer style={{
        height: '32px',
        minHeight: '32px',
        background: 'rgba(3, 7, 18, 0.9)',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(6, 182, 212, 0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.25rem',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xs)',
            color: T.textMuted,
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse-glow 2s ease infinite' }} />
            pipeline status: active
          </span>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xs)',
            color: T.textMuted,
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981', animation: 'pulse-glow 2s ease infinite' }} />
            backend status: connected
          </span>
          <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-xs)',
            color: T.textMuted,
          }}>
            uptime: {formatUptime(uptimeSeconds)}
          </span>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontFamily: 'var(--font-mono)',
          fontSize: 'var(--text-xs)',
          color: T.textMuted,
        }}>
          <span>v2.0.0-operator</span>
          <span style={{ fontFamily: 'var(--font-display)' }}>IntelliSOC</span>
        </div>
      </footer>

      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '48px',
          right: '24px',
          background: T.surface,
          border: `1px solid ${T.primary}40`,
          color: T.text,
          padding: '10px 18px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          fontFamily: 'var(--font-display)',
          fontSize: '13px',
          fontWeight: 500,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          animation: 'fadeUp 0.2s ease both',
        }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.low }} />
          {toast}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   THREAT FEED PANEL (Left-side sidebar)
   ───────────────────────────────────────── */
function ThreatFeedPanel() {
  const [threats, setThreats] = useState<ThreatItem[]>([]);

  useEffect(() => {
    const seedThreats: ThreatItem[] = [
      { id: '1', time: '17:02:14', type: 'BRUTE FORCE', source: '185.220.101.34', severity: 'CRITICAL', country: 'RU' },
      { id: '2', time: '17:01:58', type: 'SQL INJECTION', source: '45.33.32.156', severity: 'HIGH', country: 'CN' },
      { id: '3', time: '17:01:42', type: 'PORT SCAN', source: '203.0.113.50', severity: 'MEDIUM', country: 'KR' },
      { id: '4', time: '17:01:15', type: 'MALWARE BEACON', source: '198.51.100.23', severity: 'CRITICAL', country: 'IR' },
      { id: '5', time: '17:00:53', type: 'DATA EXFILTRATION', source: '91.219.237.34', severity: 'HIGH', country: 'UA' },
      { id: '6', time: '17:00:31', type: 'PRIVILEGE ESCALATION', source: '10.0.0.45', severity: 'CRITICAL', country: 'INT' },
      { id: '7', time: '16:59:47', type: 'C2 CALLBACK', source: '172.16.0.12', severity: 'HIGH', country: 'US' },
      { id: '8', time: '16:59:20', type: 'PHISHING ATTEMPT', source: '104.21.67.89', severity: 'LOW', country: 'NG' },
    ];
    setThreats(seedThreats);
  }, []);

  const getBadgeClass = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return 'badge-critical';
      case 'HIGH': return 'badge-high';
      case 'MEDIUM': return 'badge-medium';
      case 'LOW':
      default: return 'badge-low';
    }
  };

  const getSeverityBorderColor = (severity: string) => {
    switch (severity.toUpperCase()) {
      case 'CRITICAL': return '#f43f5e';
      case 'HIGH': return '#fb923c';
      case 'MEDIUM': return '#60a5fa';
      case 'LOW':
      default: return '#10b981';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${T.border}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '15px',
            fontWeight: 600,
            color: T.text,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            Threat Feed
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.critical, display: 'inline-block' }} />
          </span>
        </div>
      </div>

      {/* Threat Cards List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {threats.map((threat, idx) => {
          const isMostRecent = idx === 0;
          return (
            <div
              key={threat.id}
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                background: 'rgba(6, 182, 212, 0.03)',
                border: 'none',
                borderLeft: `3px solid ${getSeverityBorderColor(threat.severity)}`,
                margin: '4px 0',
                position: 'relative',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.08)';
                e.currentTarget.style.borderLeftColor = getSeverityBorderColor(threat.severity);
                e.currentTarget.style.filter = 'brightness(1.2)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(6, 182, 212, 0.03)';
                e.currentTarget.style.borderLeftColor = getSeverityBorderColor(threat.severity);
                e.currentTarget.style.filter = 'none';
              }}
            >
              {/* Timestamp top-right */}
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '14px',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: T.textMuted,
              }}>
                {threat.time}
              </div>

              {/* Alert Type */}
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '13px',
                fontWeight: 600,
                color: T.text,
                marginBottom: '6px',
                paddingRight: '60px', // avoid collision with time
              }}>
                {threat.type}
              </div>

              {/* IP + Country and Badge */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                marginTop: '8px'
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: T.dataText,
                }}>
                  {threat.source} · {threat.country}
                </span>

                <span className={getBadgeClass(threat.severity)}>
                  {threat.severity}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: `1px solid ${T.border}`,
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'var(--font-display)',
        fontSize: 'var(--text-xs)',
        color: T.textMuted,
      }}>
        <span>{threats.length} threats</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: T.low }}>
          <span className="pulse-glow" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981', animation: 'pulse-glow 2s ease infinite' }} />
          live
        </span>
      </div>
    </div>
  );
}

/* ── Helpers ── */
function getTimeString() {
  return new Date().toLocaleTimeString('en-US', { hour12: false });
}

function formatUptime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface ThreatItem {
  id: string;
  time: string;
  type: string;
  source: string;
  severity: string;
  country: string;
}
