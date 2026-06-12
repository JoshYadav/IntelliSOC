import { Filter, Activity } from 'lucide-react';

interface FiltersProps {
  severityFilter: string;
  typeFilter: string;
  onSeverityChange: (value: string) => void;
  onTypeChange: (value: string) => void;
}

const severities = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const attackTypes = [
  'ALL',
  'BRUTE_FORCE', 'MULTIPLE_USERS', 'ACCOUNT_COMPROMISE', 'SUDO_ABUSE',
  'HTTP_BRUTE_FORCE', 'DIRECTORY_SCAN',
  'WINDOWS_BRUTE_FORCE', 'PERSISTENCE_DETECTED', 'LATERAL_MOVEMENT',
  'MALWARE_PROCESS_CHAIN', 'SUSPICIOUS_NETWORK',
  'PORT_SCAN',
];

const T = {
  textSecondary: "#94a3b8",
};

export default function Filters({ severityFilter, typeFilter, onSeverityChange, onTypeChange }: FiltersProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      {/* Severity Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
        <Filter size={14} style={{ color: T.textSecondary }} />
        <select
          id="severity-filter"
          value={severityFilter}
          onChange={(e) => onSeverityChange(e.target.value)}
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
          {severities.map((s) => {
            const label = s === 'ALL' ? 'Severity: All' : `Severity: ${s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()}`;
            return (
              <option key={s} value={s}>
                {label}
              </option>
            );
          })}
        </select>
      </div>

      {/* Type Filter */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
        <Activity size={14} style={{ color: T.textSecondary }} />
        <select
          id="type-filter"
          value={typeFilter}
          onChange={(e) => onTypeChange(e.target.value)}
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
          {attackTypes.map((t) => {
            const label = t === 'ALL' ? 'Signature: All' : `Sig: ${t.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')}`;
            return (
              <option key={t} value={t}>
                {label}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
}
