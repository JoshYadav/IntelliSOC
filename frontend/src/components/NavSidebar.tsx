import { NavLink } from 'react-router-dom';
import { LayoutDashboard, History, ShieldAlert, Workflow, Laptop } from 'lucide-react';
import logoSrc from '../assets/logo.svg';

export default function NavSidebar() {
  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-sm)',
    color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
    background: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
    borderLeft: isActive ? '3px solid var(--color-accent-blue)' : '3px solid transparent',
    textDecoration: 'none',
    fontSize: '0.9rem',
    fontWeight: isActive ? 600 : 500,
    transition: 'all var(--transition-base)',
    marginBottom: '0.5rem',
  });

  return (
    <aside style={{
      width: '260px',
      background: 'var(--color-bg-secondary)',
      borderRight: '1px solid var(--color-border)',
      height: '100vh',
      position: 'sticky',
      top: 0,
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 1rem',
      boxSizing: 'border-box',
      zIndex: 100,
    }}>
      {/* Brand Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: '2.5rem', padding: '0 0.5rem' }}>
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

      {/* Navigation Group: SIEM */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-text-muted)',
          marginBottom: '0.75rem',
          padding: '0 0.5rem',
        }}>
          SIEM
        </h4>
        <NavLink to="/" style={linkStyle}>
          <LayoutDashboard size={18} />
          <span>Dashboard</span>
        </NavLink>
        <NavLink to="/sessions" style={linkStyle}>
          <History size={18} />
          <span>Sessions</span>
        </NavLink>
      </div>

      {/* Navigation Group: SOAR */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-text-muted)',
          marginBottom: '0.75rem',
          padding: '0 0.5rem',
        }}>
          SOAR
        </h4>
        <NavLink to="/incidents" style={linkStyle}>
          <ShieldAlert size={18} />
          <span>Incidents</span>
        </NavLink>
        <NavLink to="/playbooks" style={linkStyle}>
          <Workflow size={18} />
          <span>Playbooks</span>
        </NavLink>
      </div>

      {/* Navigation Group: EDR */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h4 style={{
          fontSize: '0.7rem',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-text-muted)',
          marginBottom: '0.75rem',
          padding: '0 0.5rem',
        }}>
          EDR
        </h4>
        <NavLink to="/endpoints" style={linkStyle}>
          <Laptop size={18} />
          <span>Endpoints</span>
        </NavLink>
      </div>

      <div style={{ marginTop: 'auto', padding: '0 0.5rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem 0',
          fontSize: '0.75rem',
          color: 'var(--color-accent-emerald)',
          fontWeight: 500,
        }}>
          <span className="pulse-glow" style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--color-accent-emerald)',
            display: 'inline-block',
          }} />
          <span>SOC Active</span>
        </div>
      </div>
    </aside>
  );
}
