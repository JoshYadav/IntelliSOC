import type { Alert } from '../types';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

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

interface AttackHeatmapProps {
  alerts: Alert[];
}

export default function AttackHeatmap({ alerts }: AttackHeatmapProps) {
  // Build 7×24 frequency grid
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));
  let maxVal = 0;

  for (const alert of alerts) {
    const d = new Date(alert.timestamp);
    // JS getDay(): 0=Sunday, 1=Monday... We want Mon=0, Sun=6
    const dayIdx = (d.getDay() + 6) % 7;
    const hourIdx = d.getHours();
    grid[dayIdx][hourIdx] += alert.count;
    if (grid[dayIdx][hourIdx] > maxVal) maxVal = grid[dayIdx][hourIdx];
  }

  if (maxVal === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: T.textSecondary }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)' }}>
          No timestamps captured for activity map.
        </p>
      </div>
    );
  }

  const CELL_SIZE = 28;
  const GAP = 3;
  const LABEL_WIDTH = 36;

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '12px' }}>
      <div style={{ display: 'inline-block', minWidth: 'fit-content' }}>
        {/* Hour labels */}
        <div style={{ display: 'flex', marginLeft: `${LABEL_WIDTH + GAP}px`, marginBottom: '4px' }}>
          {HOURS.map(h => (
            <div
              key={h}
              style={{
                width: `${CELL_SIZE}px`,
                marginRight: `${GAP}px`,
                textAlign: 'center',
                fontSize: '11px',
                color: T.textMuted,
                fontFamily: 'var(--font-mono)',
                fontWeight: 500,
              }}
            >
              {h.toString().padStart(2, '0')}
            </div>
          ))}
        </div>

        {/* Grid rows */}
        {DAYS.map((day, dayIdx) => (
          <div key={day} style={{ display: 'flex', alignItems: 'center', marginBottom: `${GAP}px` }}>
            {/* Day label */}
            <div style={{
              width: `${LABEL_WIDTH}px`,
              fontSize: '13px',
              fontWeight: 500,
              color: T.textSecondary,
              textAlign: 'right',
              paddingRight: '8px',
              fontFamily: 'var(--font-display)',
            }}>
              {day}
            </div>

            {/* Hour cells */}
            {HOURS.map(hour => {
              const count = grid[dayIdx][hour];
              const intensity = count / maxVal;

              let bg = T.surfaceDeep;
              let border = T.border;
              let textColor = 'transparent';
              
              if (count > 0) {
                textColor = T.text;
                if (intensity < 0.35) {
                  // Low: subtle green
                  bg = T.lowDim;
                  border = 'rgba(52, 211, 153, 0.25)';
                } else if (intensity < 0.7) {
                  // Medium: high orange
                  bg = T.highDim;
                  border = 'rgba(251, 146, 60, 0.25)';
                } else {
                  // High: critical red
                  bg = T.criticalDim;
                  border = 'rgba(251, 113, 133, 0.25)';
                }
              }

              return (
                <div
                  key={hour}
                  title={`${day} ${hour.toString().padStart(2, '0')}:00 — ${count} events`}
                  style={{
                    width: `${CELL_SIZE}px`,
                    height: `${CELL_SIZE}px`,
                    marginRight: `${GAP}px`,
                    background: bg,
                    border: `1px solid ${border}`,
                    borderRadius: '4px',
                    cursor: 'default',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    fontWeight: 600,
                    color: textColor,
                    fontFamily: 'var(--font-mono)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.borderColor = T.borderHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.borderColor = border;
                  }}
                >
                  {count > 0 ? count : ''}
                </div>
              );
            })}
          </div>
        ))}

        {/* Color legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px', marginLeft: `${LABEL_WIDTH + GAP}px`, fontFamily: 'var(--font-display)', fontSize: '12px' }}>
          <span style={{ color: T.textMuted }}>Low intensity</span>
          <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: T.surfaceDeep, border: `1px solid ${T.border}` }} />
          <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: T.lowDim, border: '1px solid rgba(52, 211, 153, 0.25)' }} />
          <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: T.highDim, border: '1px solid rgba(251, 146, 60, 0.25)' }} />
          <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: T.criticalDim, border: '1px solid rgba(251, 113, 133, 0.25)' }} />
          <span style={{ color: T.textMuted }}>High intensity</span>
        </div>
      </div>
    </div>
  );
}
