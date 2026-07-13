import React from 'react';
import { ComposableMap, Geographies, Geography, Marker, useMapContext } from "react-simple-maps";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { COUNTRY_CENTERS } from "./worldMapCenters";
import type { Alert } from "../types";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO 3166-1 alpha-2 to numeric code mapping
const ISO2_TO_NUMERIC: Record<string, string> = {
  "AF": "004", "AL": "008", "DZ": "012", "AS": "016", "AD": "020", "AO": "024", "AI": "0660", "AQ": "010", "AG": "028", "AR": "032",
  "AM": "051", "AW": "533", "AU": "036", "AT": "040", "AZ": "031", "BS": "044", "BH": "048", "BD": "050", "BB": "052", "BY": "112",
  "BE": "056", "BZ": "084", "BJ": "204", "BM": "060", "BT": "064", "BO": "068", "BA": "070", "BW": "072", "BV": "074", "BR": "076",
  "IO": "086", "BN": "096", "BG": "100", "BF": "854", "BI": "108", "KH": "116", "CM": "120", "CA": "124", "CV": "132", "KY": "136",
  "CF": "140", "TD": "148", "CL": "152", "CN": "156", "CX": "162", "CC": "166", "CO": "170", "KM": "174", "CG": "178", "CD": "180",
  "CK": "184", "CR": "188", "CI": "384", "HR": "191", "CU": "192", "CY": "196", "CZ": "203", "DK": "208", "DJ": "262", "DM": "212",
  "DO": "214", "EC": "218", "EG": "818", "SV": "222", "GQ": "226", "ER": "232", "EE": "233", "ET": "231", "FK": "238", "FO": "234",
  "FJ": "242", "FI": "246", "FR": "250", "GF": "254", "PF": "258", "TF": "260", "GA": "266", "GM": "270", "GE": "268", "DE": "276",
  "GH": "288", "GI": "292", "GR": "300", "GL": "304", "GD": "308", "GP": "312", "GU": "316", "GT": "320", "GG": "831", "GN": "324",
  "GW": "624", "GY": "328", "HT": "332", "HM": "334", "VA": "336", "HN": "340", "HK": "344", "HU": "348", "IS": "352", "IN": "356",
  "ID": "360", "IR": "364", "IQ": "368", "IE": "372", "IM": "833", "IL": "376", "IT": "380", "JM": "388", "JP": "392", "JE": "832",
  "JO": "400", "KZ": "398", "KE": "404", "KI": "296", "KP": "408", "KR": "410", "KW": "414", "KG": "417", "LA": "418", "LV": "428",
  "LB": "422", "LS": "426", "LR": "430", "LY": "434", "LI": "438", "LT": "440", "LU": "442", "MO": "446", "MK": "807", "MG": "450",
  "MW": "454", "MY": "458", "MV": "462", "ML": "466", "MT": "470", "MH": "584", "MQ": "474", "MR": "478", "MU": "480", "YT": "175",
  "MX": "484", "FM": "583", "MD": "498", "MC": "492", "MN": "496", "ME": "499", "MS": "500", "MA": "504", "MZ": "508", "MM": "104",
  "NA": "516", "NR": "520", "NP": "524", "NL": "528", "NC": "540", "NZ": "554", "NI": "558", "NE": "562", "NG": "566", "NU": "570",
  "NF": "574", "MP": "580", "NO": "578", "OM": "512", "PK": "586", "PW": "585", "PS": "275", "PA": "591", "PG": "598", "PY": "600",
  "PE": "604", "PH": "608", "PN": "612", "PL": "616", "PT": "620", "PR": "630", "QA": "634", "RE": "638", "RO": "642", "RU": "643",
  "RW": "646", "BL": "652", "SH": "654", "KN": "659", "LC": "662", "MF": "663", "PM": "666", "VC": "670", "WS": "882", "SM": "674",
  "ST": "678", "SA": "682", "SN": "686", "RS": "688", "SC": "690", "SL": "694", "SG": "702", "SX": "534", "SK": "703", "SI": "705",
  "SB": "090", "SO": "706", "ZA": "710", "GS": "239", "SS": "728", "ES": "724", "LK": "144", "SD": "729", "SR": "740", "SJ": "744",
  "SZ": "748", "SE": "752", "CH": "756", "SY": "760", "TW": "158", "TJ": "762", "TZ": "834", "TH": "764", "TL": "626", "TG": "768",
  "TK": "772", "TO": "776", "TT": "780", "TN": "788", "TR": "792", "TM": "795", "TC": "796", "TV": "798", "UG": "800", "UA": "804",
  "AE": "784", "GB": "826", "US": "840", "UM": "581", "UY": "858", "UZ": "860", "VU": "548", "VE": "862", "VN": "704", "VG": "092",
  "VI": "850", "WF": "876", "EH": "732", "YE": "887", "ZM": "894", "ZW": "716"
};

interface Attacker {
  lat: number;
  lng: number;
  country: string;
  count: number;
  riskScore: number;
}

interface SocCore {
  lat: number;
  lng: number;
}

interface GeoIPMapProps {
  attackers: Attacker[];
  socCore: SocCore;
  alerts?: Alert[];
  logsProcessed?: number;
}

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

const ATTACK_COLORS: Record<string, string> = {
  "CREDENTIAL_DUMPING":   "#fb7185",  // rose
  "SUSPICIOUS_NETWORK":   "#c084fc",  // violet
  "PERSISTENCE_RUN_KEY":  "#fb923c",  // orange
  "LOLBIN_ABUSE":         "#facc15",  // yellow
  "SCHEDULED_TASK_PERSIST":"#34d399", // emerald
  "SUSPICIOUS_POWERSHELL":"#38bdf8",  // sky blue
};

const getAttackTypeColor = (type: string) => {
  const norm = type.toUpperCase().replace(/\s+/g, '_').trim();
  if (ATTACK_COLORS[norm]) return ATTACK_COLORS[norm];
  if (norm.includes('DUMPING') || norm.includes('CRITICAL')) return ATTACK_COLORS.CREDENTIAL_DUMPING;
  if (norm.includes('NETWORK') || norm.includes('BEACONING')) return ATTACK_COLORS.SUSPICIOUS_NETWORK;
  if (norm.includes('RUN_KEY') || norm.includes('PERSISTENCE')) return ATTACK_COLORS.PERSISTENCE_RUN_KEY;
  if (norm.includes('LOLBIN')) return ATTACK_COLORS.LOLBIN_ABUSE;
  if (norm.includes('SCHED') || norm.includes('SCHEDULED') || norm.includes('TASK')) return ATTACK_COLORS.SCHEDULED_TASK_PERSIST;
  if (norm.includes('POWERSHELL')) return ATTACK_COLORS.SUSPICIOUS_POWERSHELL;
  if (norm.includes('BRUTE_FORCE') || norm.includes('COMPROMISE')) return ATTACK_COLORS.CREDENTIAL_DUMPING;
  if (norm.includes('PORT_SCAN') || norm.includes('SCAN') || norm.includes('DIRECTORY')) return ATTACK_COLORS.LOLBIN_ABUSE;
  
  const colors = Object.values(ATTACK_COLORS);
  let hash = 0;
  for (let i = 0; i < norm.length; i++) {
    hash = norm.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const formatLegendLabel = (name: string): string => {
  const norm = name.toUpperCase().replace(/\s+/g, '_').trim();
  if (norm.includes('CREDENTIAL_DUMPING')) return 'Credential Dumping';
  if (norm.includes('SUSPICIOUS_NETWORK')) return 'Suspicious Network';
  if (norm.includes('PERSISTENCE_RUN_KEY')) return 'Persistence Run Key';
  if (norm.includes('LOLBIN_ABUSE')) return 'LolBin Abuse';
  if (norm.includes('SCHEDULED_TASK') || norm.includes('SCHED_TASK_PERSIST')) return 'Scheduled Task';
  if (norm.includes('SUSPICIOUS_POWERSHELL')) return 'Suspicious PowerShell';
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const getLiveFeedPillStyles = (severity: string) => {
  const s = severity?.toUpperCase();
  if (s === 'CRITICAL') return { background: T.criticalDim, color: T.critical, borderColor: 'rgba(251,113,133,0.25)' };
  if (s === 'HIGH') return { background: T.highDim, color: T.high, borderColor: 'rgba(251,146,60,0.25)' };
  if (s === 'MEDIUM') return { background: T.mediumDim, color: T.medium, borderColor: 'rgba(96,165,250,0.25)' };
  return { background: T.lowDim, color: T.low, borderColor: 'rgba(52,211,153,0.25)' };
};

const formatHHMMSS = (dateStr: string) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr || '00:00:00';
    const pad = (num: number) => String(num).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  } catch {
    return '00:00:00';
  }
};

function AttackArc({
  ip,
  from,
  to,
  severityColor,
  score,
  index
}: {
  ip: string;
  from: [number, number];
  to: [number, number];
  severityColor: string;
  score: number;
  index: number;
}) {
  const { projection } = useMapContext();
  if (!projection) return null;

  const start = projection(from);
  const end = projection(to);

  if (!start || !end || isNaN(start[0]) || isNaN(start[1]) || isNaN(end[0]) || isNaN(end[1])) {
    return null;
  }

  const [startX, startY] = start;
  const [endX, endY] = end;

  // Bezier upward control point calculation
  const midX = (startX + endX) / 2;
  const midY = Math.min(startY, endY) - (Math.abs(endX - startX) * 0.35);

  const delay = `${index * 0.5}s`;
  const speed = score >= 70 ? 2 : 2.8;
  const gradientId = `arc-${ip.replace(/\./g, '-')}-${index}`;

  return (
    <g>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={severityColor} stopOpacity="0" />
          <stop offset="50%" stopColor={severityColor} stopOpacity="0.8" />
          <stop offset="100%" stopColor="#818cf8" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      <path
        d={`M ${startX},${startY} Q ${midX},${midY} ${endX},${endY}`}
        stroke={`url(#${gradientId})`}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        filter={`drop-shadow(0 0 4px ${severityColor}80)`}
        style={{
          strokeDasharray: '6 220',
          animation: `dashTravel ${speed}s linear infinite`,
          animationDelay: delay,
        }}
      />
    </g>
  );
}

export default function GeoIPMap({ attackers: _attackers, socCore, alerts = [], logsProcessed = 0 }: GeoIPMapProps) {
  const [hoveredNodeIp, setHoveredNodeIp] = React.useState<string | null>(null);
  const [hoveredSoc, setHoveredSoc] = React.useState<boolean>(false);

  const socCoordinates: [number, number] = [socCore.lng, socCore.lat];

  // Helper to determine country fill/stroke styles based on risk scores
  const getCountryStyles = (geoId: string) => {
    const countryCode = Object.keys(ISO2_TO_NUMERIC).find(
      (key) => ISO2_TO_NUMERIC[key] === geoId
    );
    if (!countryCode) {
      return { fill: "rgba(129, 140, 248, 0.04)", stroke: "rgba(129, 140, 248, 0.1)", strokeWidth: 0.35 };
    }

    const matchingAlerts = alerts.filter(a => a.country?.toUpperCase() === countryCode);
    if (matchingAlerts.length === 0) {
      return { fill: "rgba(129, 140, 248, 0.04)", stroke: "rgba(129, 140, 248, 0.1)", strokeWidth: 0.35 };
    }

    const maxScore = Math.max(...matchingAlerts.map(a => a.abuseScore ?? a.riskScore ?? 0), 0);
    if (maxScore >= 70) {
      return { fill: "rgba(251, 113, 133, 0.18)", stroke: "rgba(251, 113, 133, 0.45)", strokeWidth: 0.8 };
    } else if (maxScore >= 40) {
      return { fill: "rgba(251, 146, 60, 0.15)", stroke: "rgba(251, 146, 60, 0.35)", strokeWidth: 0.6 };
    } else {
      return { fill: "rgba(129, 140, 248, 0.04)", stroke: "rgba(129, 140, 248, 0.1)", strokeWidth: 0.35 };
    }
  };

  // Group unique attacker IPs and calculate threat country centroid info
  const uniqueIPNodes = React.useMemo(() => {
    const ipMap: Record<string, {
      ip: string;
      country: string;
      lat: number;
      lng: number;
      riskScore: number;
      abuseScore: number;
      count: number;
      types: string[];
    }> = {};

    for (const alert of alerts) {
      if (!alert.ip) continue;
      if (alert.country?.toUpperCase() === 'IN') continue;

      const ip = alert.ip;
      if (!ipMap[ip]) {
        let lat = alert.latitude;
        let lng = alert.longitude;
        if (lat === null || lng === null) {
          const center = COUNTRY_CENTERS[alert.country?.toUpperCase() || ''];
          lat = center?.lat ?? 0;
          lng = center?.lng ?? 0;
        }
        ipMap[ip] = {
          ip,
          country: alert.country || 'Unknown',
          lat,
          lng,
          riskScore: alert.riskScore,
          abuseScore: alert.abuseScore ?? alert.riskScore,
          count: 0,
          types: []
        };
      }
      ipMap[ip].count += alert.count;
      ipMap[ip].riskScore = Math.max(ipMap[ip].riskScore, alert.riskScore);
      ipMap[ip].abuseScore = Math.max(ipMap[ip].abuseScore, alert.abuseScore ?? alert.riskScore);
      if (alert.type && !ipMap[ip].types.includes(alert.type)) {
        ipMap[ip].types.push(alert.type);
      }
    }

    return Object.values(ipMap).filter(node => node.lat !== 0 || node.lng !== 0);
  }, [alerts]);

  // threatCountries centroid heat glow has been removed.

  // Sidebar Section 1 - Top Attacking Countries
  const topCountries = React.useMemo(() => {
    const counts: Record<string, { count: number; maxScore: number }> = {};
    for (const alert of alerts) {
      const cc = alert.country?.toUpperCase();
      if (!cc || cc === 'IN') continue;
      if (!counts[cc]) {
        counts[cc] = { count: 0, maxScore: 0 };
      }
      counts[cc].count += alert.count;
      counts[cc].maxScore = Math.max(counts[cc].maxScore, alert.abuseScore ?? alert.riskScore ?? 0);
    }

    return Object.entries(counts)
      .map(([country, data]) => {
        const severityColor = data.maxScore >= 70 ? T.critical : (data.maxScore >= 40 ? T.high : T.low);
        return {
          country,
          count: data.count,
          severityColor,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [alerts]);

  const maxCountryCount = Math.max(...topCountries.map(c => c.count), 1);

  // Sidebar Section 2 - Attack Vectors (PieData)
  const pieData = React.useMemo(() => {
    const typeMap: Record<string, number> = {};
    for (const alert of alerts) {
      const name = alert.type.replace(/_/g, ' ');
      typeMap[name] = (typeMap[name] || 0) + alert.count;
    }
    return Object.entries(typeMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [alerts]);

  const totalPieValue = React.useMemo(() => pieData.reduce((sum, d) => sum + d.value, 0), [pieData]);

  // Sidebar Section 3 - Live Attack Feed (reverse chronological order, max 8)
  const recentAlerts = React.useMemo(() => {
    return [...alerts]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8);
  }, [alerts]);

  if (!alerts || alerts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1.5rem', color: T.textSecondary }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)' }}>
          No geolocation signatures active in data stream.
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Inject Keyframe CSS Animations */}
      <style>{`
        @keyframes nodeRing {
          0% { transform: scale(0.9); opacity: 0.7; }
          100% { transform: scale(2.8); opacity: 0; }
        }
        @keyframes socRing {
          0%   { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(3.2); opacity: 0;   }
        }
        @keyframes dashTravel {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -600; }
        }
        @keyframes mapScan {
          0%   { top: 0%;   opacity: 0.5; }
          100% { top: 100%; opacity: 0;   }
        }
      `}</style>

      {/* MAP SECTION HEADER */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingLeft: '12px',
        borderLeft: `4px solid ${T.primary}`
      }}>
        {/* Left: Title + Live badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '20px',
            fontWeight: 600,
            color: T.text,
            textTransform: 'none',
            margin: 0
          }}>
            Live Attack Origin Map
          </h2>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            background: T.primaryDim,
            color: T.primary,
            padding: '2px 8px',
            borderRadius: '6px',
          }}>
            Live
          </span>
        </div>

        {/* Right: Inline stats separated by dividers */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', color: T.text, lineHeight: 1.1 }}>
                {alerts.length}
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-display)', color: T.textSecondary, marginTop: '2px' }}>
                Active Threats
              </div>
            </div>
            
            <div style={{ width: '1px', height: '24px', background: T.border }} />

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', color: T.text, lineHeight: 1.1 }}>
                {new Set(alerts.map(a => a.ip)).size}
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-display)', color: T.textSecondary, marginTop: '2px' }}>
                Threat Actors
              </div>
            </div>

            <div style={{ width: '1px', height: '24px', background: T.border }} />

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', color: T.text, lineHeight: 1.1 }}>
                {new Set(alerts.map(a => a.country).filter(Boolean)).size}
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-display)', color: T.textSecondary, marginTop: '2px' }}>
                Countries Flagged
              </div>
            </div>

            <div style={{ width: '1px', height: '24px', background: T.border }} />

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '20px', color: T.text, lineHeight: 1.1 }}>
                {logsProcessed || alerts.reduce((sum, a) => sum + a.count, 0)}
              </div>
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-display)', color: T.textSecondary, marginTop: '2px' }}>
                Total Connections
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OVERALL SPLIT LAYOUT */}
      <div style={{
        display: 'flex',
        width: '100%',
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: '16px',
        overflow: 'hidden'
      }}>
        {/* Left Zone (75%) - Map */}
        <div style={{
          width: '75%',
          position: 'relative',
          background: '#020810', // Darker map canvas background
          overflow: 'hidden',
          minHeight: '420px',
        }}>
          {/* Scan line overlay */}
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            height: '2px',
            background: 'linear-gradient(90deg, transparent, rgba(129, 140, 248, 0.06), transparent)',
            animation: 'mapScan 7s linear infinite',
            pointerEvents: 'none',
            zIndex: 5,
          }} />

          {/* Floating Legend Box (bottom-left) */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '16px',
            background: 'rgba(8, 13, 22, 0.88)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '12px 16px',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 10,
            pointerEvents: 'none'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.critical }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: T.textSecondary }}>
                Critical Risk &ge; 70
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.high }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: T.textSecondary }}>
                High Risk 40&ndash;69
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.low }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: T.textSecondary }}>
                Low Risk &lt; 40
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.primary }} />
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: T.textSecondary }}>
                SOC Core Target
              </span>
            </div>
          </div>

          <ComposableMap
            className="geo-map-svg"
            width={1000}
            height={500}
            projection="geoNaturalEarth1"
            projectionConfig={{
              scale: 145,
              center: [0, 0]
            }}
            style={{ width: "100%", height: "auto", background: "transparent", display: 'block' }}
          >
            {/* Country layers */}
            <Geographies geography={GEO_URL}>
              {({ geographies }: { geographies: any[] }) =>
                geographies.map((geo: any) => {
                  const styles = getCountryStyles(geo.id);
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={styles.fill}
                      stroke={styles.stroke}
                      strokeWidth={styles.strokeWidth}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: "rgba(129, 140, 248, 0.08)", outline: "none" },
                        pressed: { outline: "none" }
                      }}
                    />
                  );
                })
              }
            </Geographies>

            {/* Bezier Curved Attack Arcs */}
            {uniqueIPNodes.map((node, idx) => {
              const fromCoord: [number, number] = [node.lng, node.lat];
              const severityColor = node.abuseScore >= 70 ? T.critical : (node.abuseScore >= 40 ? T.high : (node.abuseScore >= 20 ? T.medium : T.low));
              return (
                <AttackArc
                  key={`arc-${node.ip}-${idx}`}
                  ip={node.ip}
                  from={fromCoord}
                  to={socCoordinates}
                  severityColor={severityColor}
                  score={node.abuseScore}
                  index={idx}
                />
              );
            })}



            {/* SOC_CORE Target Node (Center targets USA coordinates) */}
            <Marker coordinates={socCoordinates}>
              <g style={{ pointerEvents: 'none' }}>
                <foreignObject
                  x={-100}
                  y={-100}
                  width={200}
                  height={200}
                  style={{ overflow: 'visible', pointerEvents: 'none' }}
                >
                  <div style={{
                    position: 'relative',
                    width: '200px',
                    height: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none'
                  }}>
                    {/* Three cascading rings */}
                    <div
                      style={{
                        position: 'absolute',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: `1px solid ${T.primary}`,
                        animation: 'socRing 2.7s ease-out infinite',
                        animationDelay: '0s',
                        pointerEvents: 'none',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: `1px solid ${T.primary}`,
                        animation: 'socRing 2.7s ease-out infinite',
                        animationDelay: '0.9s',
                        pointerEvents: 'none',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: `1px solid ${T.primary}`,
                        animation: 'socRing 2.7s ease-out infinite',
                        animationDelay: '1.8s',
                        pointerEvents: 'none',
                      }}
                    />

                    {/* Core dot (14px) */}
                    <div
                      style={{
                        position: 'absolute',
                        width: '14px',
                        height: '14px',
                        borderRadius: '50%',
                        background: T.primary,
                        boxShadow: `0 0 20px ${T.primary}, 0 0 40px ${T.primary}80, 0 0 60px ${T.primary}40`,
                        pointerEvents: 'none',
                      }}
                    />

                    {/* Interactive Hit Area for SOC Core Hover */}
                    <div
                      style={{
                        position: 'absolute',
                        width: '48px',
                        height: '48px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        pointerEvents: 'auto',
                        background: 'transparent',
                        zIndex: 10,
                      }}
                      onMouseEnter={() => setHoveredSoc(true)}
                      onMouseLeave={() => setHoveredSoc(false)}
                    />

                    {/* Label card above */}
                    {hoveredSoc && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '124px',
                          fontFamily: 'var(--font-display)',
                          fontWeight: 700,
                          fontSize: '12px',
                          color: T.primary,
                          background: 'rgba(8, 13, 22, 0.92)',
                          border: '1px solid rgba(129, 140, 248, 0.4)',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          whiteSpace: 'nowrap',
                          pointerEvents: 'none',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                          zIndex: 20,
                        }}
                      >
                        SOC_CORE Target
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 500,
                          fontSize: '11px',
                          color: T.textSecondary,
                        }}>
                          Status: Active
                        </div>
                      </div>
                    )}
                  </div>
                </foreignObject>
              </g>
            </Marker>

            {/* Attacker Node Markers */}
            {uniqueIPNodes.map((node, idx) => {
              const severityColor = node.abuseScore >= 70 ? T.critical : (node.abuseScore >= 40 ? T.high : (node.abuseScore >= 20 ? T.medium : T.low));
              
              return (
                <Marker key={`node-marker-${node.ip}-${idx}`} coordinates={[node.lng, node.lat]}>
                  <g>
                    <foreignObject
                      x={-100}
                      y={-100}
                      width={200}
                      height={200}
                      style={{ overflow: 'visible' }}
                    >
                      <div style={{
                        position: 'relative',
                        width: '200px',
                        height: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none'
                      }}>
                        {/* Interactive Hit Area for Hover Detection */}
                        <div
                          style={{
                            position: 'absolute',
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            cursor: 'pointer',
                            pointerEvents: 'auto',
                            background: 'transparent',
                            zIndex: 10,
                          }}
                          onMouseEnter={() => setHoveredNodeIp(node.ip)}
                          onMouseLeave={() => setHoveredNodeIp(null)}
                        />

                        {/* 3 Cascading Outer ping rings */}
                        <div
                          style={{
                            position: 'absolute',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: `1px solid ${severityColor}`,
                            animation: 'nodeRing 2.2s ease-out infinite',
                            animationDelay: '0s',
                            pointerEvents: 'none',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: `1px solid ${severityColor}`,
                            animation: 'nodeRing 2.2s ease-out infinite',
                            animationDelay: '0.7s',
                            pointerEvents: 'none',
                          }}
                        />
                        <div
                          style={{
                            position: 'absolute',
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            border: `1px solid ${severityColor}`,
                            animation: 'nodeRing 2.2s ease-out infinite',
                            animationDelay: '1.4s',
                            pointerEvents: 'none',
                          }}
                        />

                        {/* Mid ring (14px static) */}
                        <div
                          style={{
                            position: 'absolute',
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            border: `1.5px solid ${severityColor}`,
                            pointerEvents: 'none',
                          }}
                        />

                        {/* Core dot (8px glowing) */}
                        <div
                          style={{
                            position: 'absolute',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: severityColor,
                            boxShadow: `0 0 12px ${severityColor}, 0 0 24px ${severityColor}99`,
                            pointerEvents: 'none',
                          }}
                        />

                        {/* Floating Intel Label Card */}
                        {hoveredNodeIp === node.ip && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '124px',
                              left: '50%',
                              transform: 'translateX(-50%)',
                              width: 'max-content',
                              background: 'rgba(8, 13, 22, 0.92)',
                              border: `1px solid ${severityColor}30`,
                              borderLeft: `2px solid ${severityColor}`,
                              borderRadius: '8px',
                              padding: '6px 10px',
                              backdropFilter: 'blur(8px)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                              pointerEvents: 'none',
                            }}
                          >
                            {/* Line 1: cc + IP */}
                            <div style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 600,
                              fontSize: '11px',
                              color: severityColor,
                            }}>
                              {node.country} {node.ip}
                            </div>
                            
                            {/* Line 2: top alert type */}
                            <div style={{
                              fontFamily: 'var(--font-display)',
                              fontWeight: 400,
                              fontSize: '11px',
                              color: 'rgba(148, 163, 184, 0.8)',
                              whiteSpace: 'nowrap',
                            }}>
                              {node.types[0] || 'Suspicious Activity'}
                            </div>
                            
                            {/* Line 3: Score */}
                            <div style={{
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 500,
                              fontSize: '11px',
                              color: `${severityColor}99`,
                            }}>
                              Score: {node.abuseScore}
                            </div>
                          </div>
                        )}
                      </div>
                    </foreignObject>
                  </g>
                </Marker>
              );
            })}
          </ComposableMap>
        </div>

        {/* Right Zone (25%) - Sidebar */}
        <div style={{
          width: '25%',
          background: T.surface,
          borderLeft: `1px solid ${T.border}`,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Section 1 — Top Attacking Countries */}
          <div style={{
            padding: '20px',
            marginBottom: '20px',
            borderBottom: `1px solid ${T.border}`,
          }}>
            <h4 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              fontWeight: 600,
              color: T.textSecondary,
              marginBottom: '12px'
            }}>
              Top Threat Origins
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {topCountries.map((c) => {
                const percentage = (c.count / maxCountryCount) * 100;
                return (
                  <div key={`country-row-${c.country}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{
                      width: '24px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: T.dataText,
                    }}>
                      {c.country}
                    </span>
                    <div style={{ flex: 1, height: '4px', background: T.surfaceDeep, borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${percentage}%`,
                        height: '100%',
                        background: c.severityColor,
                        borderRadius: '3px',
                        transition: 'width 1s ease-out',
                      }} />
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '12px',
                      fontWeight: 700,
                      color: T.text,
                      textAlign: 'right',
                      minWidth: '28px'
                    }}>
                      {c.count}
                    </span>
                  </div>
                );
              })}
              {topCountries.length === 0 && (
                <div style={{ fontSize: '13px', color: T.textMuted, textAlign: 'center', padding: '12px 0' }}>
                  No threat origins detected
                </div>
              )}
            </div>
          </div>

          {/* Section 2 — Attack Type Breakdown */}
          <div style={{
            padding: '20px',
            marginBottom: '20px',
            borderBottom: `1px solid ${T.border}`,
          }}>
            <h4 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              fontWeight: 600,
              color: T.textSecondary,
              marginBottom: '12px'
            }}>
              Attack Vectors
            </h4>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', height: '110px' }}>
              <div style={{ position: 'relative', width: '110px', height: '100px', flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={32}
                      outerRadius={45}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getAttackTypeColor(entry.name)} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: T.text,
                    lineHeight: 1
                  }}>
                    {totalPieValue}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '9px',
                    color: T.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    marginTop: '2px'
                  }}>
                    total
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                {pieData.slice(0, 4).map((entry) => {
                  const color = getAttackTypeColor(entry.name);
                  return (
                    <div key={entry.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', fontSize: '11px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                        <span style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          backgroundColor: color,
                          flexShrink: 0
                        }} />
                        <span style={{
                          color: T.textSecondary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '75px'
                        }}>
                          {formatLegendLabel(entry.name)}
                        </span>
                      </div>
                      <span style={{
                        fontWeight: 600,
                        color: color
                      }}>
                        {entry.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Section 3 — Live Attack Feed */}
          <div style={{
            padding: '20px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: '240px'
          }}>
            <h4 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '13px',
              fontWeight: 600,
              color: T.textSecondary,
              marginBottom: '12px'
            }}>
              Live Feed
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', overflow: 'hidden' }}>
              {recentAlerts.map((alert) => {
                const badgeStyle = getLiveFeedPillStyles(alert.severity);

                return (
                  <div
                    key={alert.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '4px 0',
                      borderBottom: `1px solid ${T.border}`,
                      animation: 'fadeUp 0.3s ease-out',
                    }}
                  >
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: T.textMuted,
                      flexShrink: 0
                    }}>
                      {formatHHMMSS(alert.timestamp)}
                    </span>
                    
                    <span className="badge" style={{
                      fontSize: '9px',
                      padding: '1px 6px',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      border: '1px solid',
                      borderRadius: '6px',
                      ...badgeStyle
                    }}>
                      {alert.type.replace(/_/g, ' ')}
                    </span>
                    
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: T.dataText,
                      textOverflow: 'ellipsis',
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textAlign: 'right',
                      flex: 1
                    }}>
                      {alert.ip}
                    </span>
                  </div>
                );
              })}
              {recentAlerts.length === 0 && (
                <div style={{ fontSize: '13px', color: T.textMuted, textAlign: 'center', padding: '16px 0' }}>
                  No live feed entries
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
