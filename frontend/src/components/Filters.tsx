import { Filter, Activity } from 'lucide-react';

interface FiltersProps {
  severityFilter: string;
  typeFilter: string;
  onSeverityChange: (value: string) => void;
  onTypeChange: (value: string) => void;
}

const severities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const attackTypes = ['ALL', 'BRUTE_FORCE', 'MULTIPLE_USERS', 'ACCOUNT_COMPROMISE'];

const selectStyle: React.CSSProperties = {
  padding: '0.6rem 1rem',
  paddingLeft: '2.5rem',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--color-border)',
  background: 'var(--color-bg-input)',
  color: 'var(--color-text-primary)',
  fontSize: '0.85rem',
  fontFamily: 'inherit',
  cursor: 'pointer',
  outline: 'none',
  minWidth: '180px',
  appearance: 'none' as const,
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  paddingRight: '2rem',
};

export default function Filters({ severityFilter, typeFilter, onSeverityChange, onTypeChange }: FiltersProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      marginBottom: '1rem',
      flexWrap: 'wrap',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
        <label style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Severity
        </label>
        <div className="relative isolate group">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none group-hover:text-amber-500 transition-colors" />
          <select
            id="severity-filter"
            value={severityFilter}
            onChange={(e) => onSeverityChange(e.target.value)}
            style={selectStyle}
            className="hover:border-amber-500/50 hover:bg-slate-800/80 transition-all duration-300 relative z-0"
          >
            {severities.map((s) => (
              <option key={s} value={s} style={{ background: 'var(--color-bg-secondary)' }}>
                {s === 'ALL' ? 'All Severities' : s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', position: 'relative' }}>
        <label style={{
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--color-text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>
          Attack Type
        </label>
        <div className="relative isolate group">
          <Activity size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 pointer-events-none group-hover:text-blue-500 transition-colors" />
          <select
            id="type-filter"
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value)}
            style={selectStyle}
            className="hover:border-blue-500/50 hover:bg-slate-800/80 transition-all duration-300 relative z-0"
          >
            {attackTypes.map((t) => (
              <option key={t} value={t} style={{ background: 'var(--color-bg-secondary)' }}>
                {t === 'ALL' ? 'All Types' : t.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
