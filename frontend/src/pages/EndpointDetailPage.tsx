import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getEndpointDetail,
  isolateHost,
  unisolateHost,
  getEndpointTelemetry,
  getEndpointAlerts
} from '../api/client';
import type { Endpoint, ProcessEntry, NetworkEntry, FileEntry, Alert } from '../types';
import {
  ArrowLeft,
  Lock,
  Unlock,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Terminal,
  Network,
  FileCode,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
  Info
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

// Priority / Severity color helper
const severityColors: Record<string, { border: string; text: string; bg: string }> = {
  CRITICAL: { border: 'rgba(251, 113, 133, 0.25)', text: T.critical, bg: T.criticalDim },
  HIGH: { border: 'rgba(251, 146, 60, 0.25)', text: T.high, bg: T.highDim },
  MEDIUM: { border: 'rgba(96, 165, 250, 0.25)', text: T.medium, bg: T.mediumDim },
  LOW: { border: 'rgba(52, 211, 153, 0.25)', text: T.low, bg: T.lowDim },
};

// Check if a process command-line or name is suspicious
const SUSPICIOUS_PATTERNS = [
  /mimikatz/i,
  /procdump/i,
  /certutil/i,
  /bitsadmin/i,
  /powershell.*bypass/i,
  /powershell.*-enc/i,
  /powershell.*iex/i,
  /schtasks.*\/create/i,
  /reg.*add.*\\Run/i,
  /psexec/i,
  /psexesvc/i,
  /comsvcs\.dll/i,
  /mshta/i,
  /regsvr32/i
];

function isSuspiciousProcess(proc: ProcessEntry): boolean {
  const text = `${proc.name} ${proc.commandLine || ''} ${proc.path || ''}`;
  return SUSPICIOUS_PATTERNS.some(p => p.test(text));
}

// Collapsible Process Tree node
interface TreeNodeProps {
  node: ProcessNode;
  toggleExpand: (pid: number) => void;
  expandedPids: Set<number>;
  depth: number;
}

interface ProcessNode {
  pid: number;
  name: string;
  parentPid?: number;
  path?: string;
  commandLine?: string;
  children: ProcessNode[];
}

function TreeNode({ node, toggleExpand, expandedPids, depth }: TreeNodeProps) {
  const isExpanded = expandedPids.has(node.pid);
  const hasChildren = node.children.length > 0;
  const isSuspicious = isSuspiciousProcess(node);

  return (
    <div style={{ marginLeft: `${depth * 1.25}rem`, marginTop: '0.25rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '4px 8px',
          borderRadius: '6px',
          background: isSuspicious ? T.criticalDim : 'transparent',
          borderLeft: isSuspicious ? `3px solid ${T.critical}` : '3px solid transparent',
          cursor: 'default',
          fontSize: 'var(--text-sm)',
          color: isSuspicious ? T.critical : T.text,
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = isSuspicious ? 'rgba(251, 113, 133, 0.18)' : T.surfaceHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = isSuspicious ? T.criticalDim : 'transparent';
        }}
      >
        {/* Toggle Button */}
        {hasChildren ? (
          <button
            onClick={() => toggleExpand(node.pid)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              color: T.textSecondary,
            }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        ) : (
          <span style={{ width: '14px' }} />
        )}

        <Terminal size={14} style={{ color: isSuspicious ? T.critical : T.textSecondary, opacity: 0.8 }} />

        {/* Process Details */}
        <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', color: isSuspicious ? T.critical : T.text }}>
          {node.name}
        </span>
        <span style={{ fontSize: 'var(--text-xs)', color: T.textMuted, fontFamily: 'var(--font-mono)', marginLeft: '4px' }}>
          ({node.pid})
        </span>

        {/* Suspicious tag */}
        {isSuspicious && (
          <span className="badge badge--critical" style={{ background: T.criticalDim, color: T.critical, borderColor: 'rgba(251,113,133,0.25)', fontSize: '10px' }}>
            SUSPICIOUS
          </span>
        )}

        {/* CommandLine Preview */}
        {node.commandLine && (
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: isSuspicious ? T.critical : T.textSecondary,
              fontFamily: 'var(--font-mono)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '600px',
              paddingLeft: '0.5rem',
              opacity: 0.8,
            }}
            title={node.commandLine}
          >
            ▸ {node.commandLine}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div style={{ position: 'relative' }}>
          {/* Subtle vertical alignment guide line */}
          <div style={{
            position: 'absolute',
            left: `${(depth * 1.25) + 0.4}rem`,
            top: 0,
            bottom: '8px',
            width: '1px',
            background: T.border,
          }} />
          <div>
            {node.children.map((child) => (
              <TreeNode
                key={child.pid}
                node={child}
                toggleExpand={toggleExpand}
                expandedPids={expandedPids}
                depth={depth + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EndpointDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [endpoint, setEndpoint] = useState<Endpoint | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [activeTab, setActiveTab] = useState<'processes' | 'network' | 'files' | 'alerts'>('processes');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Telemetry feeds
  const [processList, setProcessList] = useState<ProcessEntry[]>([]);
  const [networkConns, setNetworkConns] = useState<NetworkEntry[]>([]);
  const [fileEvents, setFileEvents] = useState<FileEntry[]>([]);
  const [expandedPids, setExpandedPids] = useState<Set<number>>(new Set([0])); // Keep PID 0/Roots open by default

  const fetchTelemetryData = useCallback(async (endpointId: string, tab: string) => {
    try {
      if (tab === 'processes') {
        const tel = await getEndpointTelemetry(endpointId, 'processes');
        const latest = tel[0]?.data ?? [];
        setProcessList(latest);

        const pids = new Set<number>();
        latest.forEach((p: ProcessEntry) => {
          if (p.parentPid === undefined || p.parentPid === 0 || isSuspiciousProcess(p)) {
            pids.add(p.pid);
            if (p.parentPid) pids.add(p.parentPid);
          }
        });
        setExpandedPids(pids);
      } else if (tab === 'network') {
        const tel = await getEndpointTelemetry(endpointId, 'network');
        const latest = tel[0]?.data ?? [];
        setNetworkConns(latest);
      } else if (tab === 'files') {
        const tel = await getEndpointTelemetry(endpointId, 'files');
        const allEvents: FileEntry[] = [];
        tel.forEach((t) => {
          if (Array.isArray(t.data)) {
            allEvents.push(...t.data);
          }
        });
        setFileEvents(allEvents);
      }
    } catch (err) {
      console.error(`Failed to fetch ${tab} telemetry:`, err);
    }
  }, []);

  const fetchDetails = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [epData, alertData] = await Promise.all([
        getEndpointDetail(id),
        getEndpointAlerts(id)
      ]);
      setEndpoint(epData);
      setAlerts(alertData);

      await fetchTelemetryData(id, activeTab);
    } catch (err: any) {
      console.error('Failed to load endpoint details:', err);
      setError(
        err?.response?.data?.error ??
        err?.message ??
        'Failed to fetch endpoint details.'
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, activeTab, fetchTelemetryData]);

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  // Handle Tab Switch
  const handleTabChange = (tab: 'processes' | 'network' | 'files' | 'alerts') => {
    setActiveTab(tab);
    if (endpoint) {
      fetchTelemetryData(endpoint.id, tab);
    }
  };

  // Isolate/Unisolate Action Handler
  const handleToggleIsolation = async () => {
    if (!endpoint) return;
    setActionLoading(true);
    setError(null);
    try {
      if (endpoint.status === 'ISOLATED') {
        const updated = await unisolateHost(endpoint.id);
        setEndpoint(prev => prev ? { ...prev, status: updated.status } : null);
      } else {
        const updated = await isolateHost(endpoint.id);
        setEndpoint(prev => prev ? { ...prev, status: updated.status } : null);
      }
    } catch (err: any) {
      console.error('Failed to update isolation status:', err);
      setError(err?.response?.data?.error ?? err?.message ?? 'Failed to toggle isolation.');
    } finally {
      setActionLoading(false);
    }
  };

  // Expand / Collapse Pid toggle
  const toggleExpand = (pid: number) => {
    setExpandedPids(prev => {
      const next = new Set(prev);
      if (next.has(pid)) {
        next.delete(pid);
      } else {
        next.add(pid);
      }
      return next;
    });
  };

  // Build hierarchical process tree
  const buildProcessTree = (): ProcessNode[] => {
    const map = new Map<number, ProcessNode>();
    const roots: ProcessNode[] = [];

    processList.forEach((p) => {
      map.set(p.pid, {
        pid: p.pid,
        name: p.name,
        parentPid: p.parentPid,
        path: p.path,
        commandLine: p.commandLine,
        children: [],
      });
    });

    processList.forEach((p) => {
      const node = map.get(p.pid);
      if (!node) return;

      const parentPid = p.parentPid;
      if (parentPid && map.has(parentPid)) {
        const parent = map.get(parentPid);
        parent?.children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  if (isLoading && !endpoint) {
    return (
      <div className="op-card" style={{ padding: '4rem 1.5rem', textAlign: 'center', color: T.textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <Loader2 size={32} style={{ color: T.primary, animation: 'spin 1s linear infinite' }} />
        <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)' }}>Resolving EDR agent protocols...</p>
      </div>
    );
  }

  if (error && !endpoint) {
    return (
      <div className="op-card" style={{ maxWidth: '600px', margin: '4rem auto', padding: '2rem', textAlign: 'center' }}>
        <AlertTriangle size={40} style={{ color: T.critical, marginBottom: '1.25rem', margin: '0 auto 1.25rem auto' }} />
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: '0.5rem' }}>Telemetry Stream Disconnect</h3>
        <p style={{ color: T.textSecondary, fontSize: 'var(--text-sm)', marginBottom: '1.5rem', fontFamily: 'var(--font-display)', lineHeight: 1.5 }}>{error}</p>
        <button
          onClick={() => navigate('/endpoints')}
          style={{
            background: 'transparent',
            border: `1px solid ${T.border}`,
            color: T.textSecondary,
            borderRadius: '8px',
            padding: '8px 16px',
            fontFamily: 'var(--font-display)',
            fontWeight: 500,
            fontSize: 'var(--text-sm)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <ArrowLeft size={14} /> Return to Inventory
        </button>
      </div>
    );
  }

  if (!endpoint) return null;

  const processTree = buildProcessTree();

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount = alerts.filter(a => a.severity === 'HIGH').length;
  const mediumCount = alerts.filter(a => a.severity === 'MEDIUM').length;
  const lowCount = alerts.filter(a => a.severity === 'LOW').length;

  const statCards = [
    { label: 'Critical Threats', value: criticalCount, color: criticalCount > 0 ? T.critical : T.text },
    { label: 'High Priority', value: highCount, color: highCount > 0 ? T.high : T.text },
    { label: 'Medium Severity', value: mediumCount, color: T.text },
    { label: 'Low Warnings', value: lowCount, color: T.text },
  ];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', animation: 'fadeUp 0.4s ease both' }}>
      
      {/* Back to Inventory link */}
      <button
        onClick={() => navigate('/endpoints')}
        style={{
          background: 'transparent',
          border: `1px solid ${T.border}`,
          color: T.textSecondary,
          borderRadius: '8px',
          padding: '8px 16px',
          fontFamily: 'var(--font-display)',
          fontWeight: 500,
          fontSize: 'var(--text-sm)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '2rem',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = T.borderHover;
          e.currentTarget.style.color = T.text;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = T.border;
          e.currentTarget.style.color = T.textSecondary;
        }}
      >
        <ArrowLeft size={14} /> Return to Endpoint Inventory
      </button>

      {/* Host Details Banner */}
      <div className="op-card" style={{ padding: '24px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: 'var(--text-2xl)', fontWeight: 600, fontFamily: 'var(--font-display)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                {endpoint.hostname}
                {endpoint.status === 'ONLINE' && (
                  <span className="badge badge--low" style={{ background: T.lowDim, color: T.low, borderColor: 'rgba(52, 211, 153, 0.25)' }}>
                    ONLINE
                  </span>
                )}
                {endpoint.status === 'OFFLINE' && (
                  <span className="badge" style={{ border: `1px solid ${T.border}`, color: T.textMuted, background: 'transparent' }}>
                    OFFLINE
                  </span>
                )}
                {endpoint.status === 'ISOLATED' && (
                  <span className="badge badge--critical" style={{ background: T.criticalDim, color: T.critical, borderColor: 'rgba(251, 113, 133, 0.25)' }}>
                    <Lock size={10} style={{ marginRight: '4px', display: 'inline' }} />
                    ISOLATED
                  </span>
                )}
              </h2>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '8px', flexWrap: 'wrap', fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', color: T.textSecondary }}>
                <span>
                  IP Address: <strong style={{ color: T.dataText, fontFamily: 'var(--font-mono)', fontWeight: 400 }}>{endpoint.ip || '0.0.0.0'}</strong>
                </span>
                <span>
                  OS Platform: <strong>{(endpoint.os || 'Unknown').charAt(0).toUpperCase() + (endpoint.os || 'unknown').slice(1).toLowerCase()}</strong>
                </span>
                <span>
                  Agent Version: <strong>{endpoint.agentVersion || '1.0.0'}</strong>
                </span>
                <span>
                  Last Contact: <strong>{new Date(endpoint.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).toLowerCase()}</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={handleToggleIsolation}
            disabled={actionLoading}
            style={{
              background: 'transparent',
              border: `1px solid ${endpoint.status === 'ISOLATED' ? T.primary : T.critical}`,
              color: endpoint.status === 'ISOLATED' ? T.primary : T.critical,
              borderRadius: '8px',
              padding: '10px 20px',
              fontFamily: 'var(--font-display)',
              fontWeight: 500,
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = endpoint.status === 'ISOLATED' ? T.primaryDim : T.criticalDim;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {actionLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : endpoint.status === 'ISOLATED' ? (
              <>
                <Unlock size={14} />
                Unisolate Host
              </>
            ) : (
              <>
                <Lock size={14} />
                Isolate Host (Firewall Lock)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Threat Summary Banner */}
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
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.4), 0 8px 24px rgba(0,0,0,0.2)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              transition: 'border-color 0.15s ease',
              animation: 'fadeUp 0.4s ease both',
              animationDelay: `${i * 60}ms`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = T.borderHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = T.border;
            }}
          >
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-4xl)',
              fontWeight: 700,
              color: card.color,
              lineHeight: 1.1,
              marginBottom: '8px',
            }}>
              {card.value}
            </div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'var(--text-sm)',
              fontWeight: 500,
              color: T.textSecondary,
            }}>
              {card.label}
            </div>
          </div>
        ))}
      </div>

      {/* Detail Tabs Control */}
      <div style={{
        display: 'flex',
        borderBottom: `1px solid ${T.border}`,
        marginBottom: '2rem',
        overflowX: 'auto',
      }}>
        {[
          { id: 'processes', label: 'Process Tree Monitor', icon: <Terminal size={14} /> },
          { id: 'network', label: 'Socket Connection Map', icon: <Network size={14} /> },
          { id: 'files', label: 'File Changes Logger', icon: <FileCode size={14} /> },
          { id: 'alerts', label: 'Host Agent Detections', icon: <ShieldAlert size={14} />, badge: alerts.length },
        ].map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as any)}
              style={{
                height: '48px',
                padding: '0 1.25rem',
                fontSize: '14px',
                fontFamily: 'var(--font-display)',
                fontWeight: 500,
                color: isActive ? T.primary : T.textSecondary,
                border: 'none',
                background: 'none',
                borderBottom: isActive ? `2px solid ${T.primary}` : '2px solid transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'color 0.15s ease, border-bottom-color 0.15s ease',
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="badge badge--critical" style={{ background: T.criticalDim, color: T.critical, borderColor: 'rgba(251,113,133,0.25)', fontSize: '10px', marginLeft: '4px' }}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="op-card" style={{ padding: '24px', minHeight: '400px', marginBottom: '3rem' }}>

        {/* 1. PROCESS TREE TAB */}
        {activeTab === 'processes' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: T.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-display)' }}>
                <Info size={14} style={{ color: T.primary }} /> Hierarchical parent-child process tree reconstructed from latest endpoint snapshot.
              </span>
              <button
                onClick={() => fetchTelemetryData(endpoint.id, 'processes')}
                style={{
                  background: 'transparent',
                  border: `1px solid ${T.border}`,
                  color: T.textSecondary,
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={12} /> Sync Tree
              </button>
            </div>

            {processList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem 1rem', color: T.textSecondary }}>
                <Terminal size={40} style={{ marginBottom: '1rem', opacity: 0.4, margin: '0 auto 1rem auto' }} />
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)' }}>No active process records reported by agent.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto', background: T.surfaceDeep, padding: '16px', borderRadius: '12px', border: `1px solid ${T.border}` }}>
                {processTree.map((root) => (
                  <TreeNode
                    key={root.pid}
                    node={root}
                    toggleExpand={toggleExpand}
                    expandedPids={expandedPids}
                    depth={0}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 2. NETWORK CONNECTIONS TAB */}
        {activeTab === 'network' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: T.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-display)' }}>
                <Info size={14} style={{ color: T.primary }} /> Live sockets open on the interface. Established external connections require validation.
              </span>
              <button
                onClick={() => fetchTelemetryData(endpoint.id, 'network')}
                style={{
                  background: 'transparent',
                  border: `1px solid ${T.border}`,
                  color: T.textSecondary,
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={12} /> Sync Connections
              </button>
            </div>

            {networkConns.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem 1rem', color: T.textSecondary }}>
                <Network size={40} style={{ marginBottom: '1rem', opacity: 0.4, margin: '0 auto 1rem auto' }} />
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)' }}>No sockets in recent telemetry record.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="op-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Protocol</th>
                      <th style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Local port</th>
                      <th style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Local address</th>
                      <th style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Remote address</th>
                      <th style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Remote port</th>
                      <th style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>State</th>
                      <th style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)', textAlign: 'right' }}>Pid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {networkConns.map((conn, index) => {
                      const isExternal = conn.remoteAddress !== '0.0.0.0' && conn.remoteAddress !== '127.0.0.1' && conn.remoteAddress !== '::' && conn.remoteAddress !== '*';
                      const isEstablished = conn.state === 'ESTABLISHED';

                      return (
                        <tr
                          key={index}
                          style={{
                            borderBottom: `1px solid ${T.border}`,
                            backgroundColor: isExternal && isEstablished ? 'rgba(251, 113, 133, 0.03)' : 'transparent',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '14px 16px', fontWeight: 600, color: T.text }}>{conn.protocol || 'TCP'}</td>
                          <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: T.dataText }}>{conn.localPort}</td>
                          <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: T.dataText }}>{conn.localAddress}</td>
                          <td style={{
                            padding: '14px 16px',
                            color: isExternal ? T.critical : T.textSecondary,
                            fontFamily: 'var(--font-mono)',
                            fontSize: '13px',
                          }}>
                            {conn.remoteAddress}
                            {isExternal && (
                              <span className="badge badge--critical" style={{ background: T.criticalDim, color: T.critical, borderColor: 'rgba(251,113,133,0.25)', fontSize: '10px', marginLeft: '6px' }}>
                                EGRESS EXTERNAL
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: '13px', color: T.dataText }}>{conn.remotePort}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span className="badge" style={{
                              borderColor: isEstablished ? 'rgba(52, 211, 153, 0.25)' : T.border,
                              color: isEstablished ? T.low : T.textMuted,
                              background: isEstablished ? T.lowDim : 'transparent',
                              fontSize: '11px'
                            }}>
                              {conn.state}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '13px', color: T.text }}>{conn.pid || '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 3. FILE EVENTS LOGGER TAB */}
        {activeTab === 'files' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: T.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-display)' }}>
                <Info size={14} style={{ color: T.primary }} /> Live directory modification streams reported by EDR agent filesystem filters.
              </span>
              <button
                onClick={() => fetchTelemetryData(endpoint.id, 'files')}
                style={{
                  background: 'transparent',
                  border: `1px solid ${T.border}`,
                  color: T.textSecondary,
                  borderRadius: '6px',
                  padding: '6px 12px',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={12} /> Sync Events
              </button>
            </div>

            {fileEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem 1rem', color: T.textSecondary }}>
                <FileCode size={40} style={{ marginBottom: '1rem', opacity: 0.4, margin: '0 auto 1rem auto' }} />
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)' }}>No filesystem modification events logged.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="op-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Timestamp</th>
                      <th style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Operation</th>
                      <th style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)' }}>Target filename / path</th>
                      <th style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, fontFamily: 'var(--font-display)', color: T.textSecondary, fontWeight: 600, fontSize: 'var(--text-xs)', textAlign: 'right' }}>Size (bytes)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fileEvents.map((evt, index) => {
                      let opBadge = <span className="badge badge--high" style={{ background: T.highDim, color: T.high, borderColor: 'rgba(251, 146, 60, 0.25)' }}>MODIFY</span>;
                      if (evt.operation === 'CREATE') {
                        opBadge = <span className="badge badge--low" style={{ background: T.lowDim, color: T.low, borderColor: 'rgba(52, 211, 153, 0.25)' }}>CREATE</span>;
                      } else if (evt.operation === 'DELETE') {
                        opBadge = <span className="badge badge--critical" style={{ background: T.criticalDim, color: T.critical, borderColor: 'rgba(251, 113, 133, 0.25)' }}>DELETE</span>;
                      } else if (evt.operation === 'RENAME') {
                        opBadge = <span className="badge badge--medium" style={{ background: T.mediumDim, color: T.medium, borderColor: 'rgba(96, 165, 250, 0.25)' }}>RENAME</span>;
                      }

                      return (
                        <tr key={index} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background-color 0.15s ease' }}>
                          <td style={{ padding: '14px 16px', color: T.textSecondary, fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                            {evt.modifiedTime ? new Date(evt.modifiedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : 'Recent'}
                          </td>
                          <td style={{ padding: '14px 16px' }}>{opBadge}</td>
                          <td style={{ padding: '14px 16px', color: T.dataText, fontFamily: 'var(--font-mono)', fontSize: '13px' }}>{evt.path}</td>
                          <td style={{ padding: '14px 16px', textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '13px', color: T.text }}>
                            {evt.size !== undefined ? evt.size.toLocaleString() : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. ENDPOINT ALERTS TAB */}
        {activeTab === 'alerts' && (
          <div>
            <div style={{ marginBottom: '1.5rem' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: T.textSecondary, display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-display)' }}>
                <Info size={14} style={{ color: T.primary }} /> EDR host detections matching MITRE tactics and severity classifications.
              </span>
            </div>

            {alerts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '5rem 1rem', color: T.textSecondary }}>
                <ShieldAlert size={40} style={{ marginBottom: '1rem', opacity: 0.4, color: T.low, margin: '0 auto 1rem auto' }} />
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', color: T.low }}>Clean: no active detections running on this host.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {alerts.map((alert) => {
                  const sev = severityColors[alert.severity] || severityColors.LOW;

                  return (
                    <div
                      key={alert.id}
                      style={{
                        padding: '20px',
                        background: T.surfaceDeep,
                        border: `1px solid ${T.border}`,
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        transition: 'border-color 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = T.borderHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = T.border;
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge" style={{
                            border: `1px solid ${sev.border}`,
                            color: sev.text,
                            background: sev.bg,
                          }}>
                            {alert.severity}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '15px', fontFamily: 'var(--font-display)', color: T.text }}>
                            {alert.type.replace(/_/g, ' ').charAt(0).toUpperCase() + alert.type.replace(/_/g, ' ').slice(1).toLowerCase()}
                          </span>
                        </div>
                        <span style={{ fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', color: T.textSecondary }}>
                          {new Date(alert.timestamp).toLocaleString([], { hour12: false }).toLowerCase()}
                        </span>
                      </div>

                      <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: T.textSecondary, lineHeight: 1.6, fontFamily: 'var(--font-display)' }}>
                        {alert.explanation}
                      </p>

                      {alert.mitreTactic && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', fontSize: 'var(--text-xs)', color: T.primary, fontFamily: 'var(--font-display)' }}>
                          <span style={{ fontWeight: 500 }}>MITRE ATT&CK Reference:</span>
                          <span className="badge badge--info" style={{ background: T.primaryDim, color: T.primary, borderColor: 'rgba(129, 140, 248, 0.25)', fontSize: '10px' }}>
                            {alert.mitreTactic}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
