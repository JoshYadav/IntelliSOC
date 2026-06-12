import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getIncident,
  updateIncident,
  addIncidentNote,
  getAiSummary,
  getPlaybooks,
  runPlaybookOnIncident,
  approveAction,
} from '../api/client';
import type { Incident, Playbook, StepResult } from '../types';
import AlertsTable from '../components/AlertsTable';
import { formatIncidentTitleAndSubtitle } from '../utils/incident';
import {
  ArrowLeft,
  Sparkles,
  Play,
  Send,
  Loader2,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Clock,
  Activity,
  Workflow,
  Check,
  RefreshCw
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

const priorityColors: Record<string, { border: string; text: string; bg: string }> = {
  CRITICAL: { border: 'rgba(251, 113, 133, 0.25)', text: T.critical, bg: T.criticalDim },
  HIGH: { border: 'rgba(251, 146, 60, 0.25)', text: T.high, bg: T.highDim },
  MEDIUM: { border: 'rgba(96, 165, 250, 0.25)', text: T.medium, bg: T.mediumDim },
  LOW: { border: 'rgba(52, 211, 153, 0.25)', text: T.low, bg: T.lowDim },
};

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [incident, setIncident] = useState<Incident | null>(null);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [selectedPlaybookId, setSelectedPlaybookId] = useState('');
  const [noteContent, setNoteContent] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [isPlaybookTriggering, setIsPlaybookTriggering] = useState(false);
  const [isNoteSubmitting, setIsNoteSubmitting] = useState(false);
  const [isUpdatingMetadata, setIsUpdatingMetadata] = useState(false);
  const [actionApprovalLoading, setActionApprovalLoading] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);

  const fetchIncidentDetails = useCallback(async () => {
    if (!id) return;
    setError(null);
    try {
      const [incidentData, playbooksData] = await Promise.all([
        getIncident(id),
        getPlaybooks(),
      ]);
      setIncident(incidentData);
      setPlaybooks(playbooksData);
      if (playbooksData.length > 0 && !selectedPlaybookId) {
        setSelectedPlaybookId(playbooksData[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load incident details:', err);
      setError(err?.response?.data?.error ?? err?.message ?? 'Failed to load details.');
    } finally {
      setIsLoading(false);
    }
  }, [id, selectedPlaybookId]);

  useEffect(() => {
    fetchIncidentDetails();
  }, [fetchIncidentDetails]);

  // AI Summary Generator
  const handleGenerateAiSummary = async (force = false) => {
    if (!id) return;
    setIsAiGenerating(true);
    try {
      const summary = await getAiSummary(id, force);
      if (incident) {
        setIncident({ ...incident, aiSummary: summary });
      }
      await fetchIncidentDetails();
    } catch (err: any) {
      console.error('Failed to generate AI summary:', err);
      alert(err?.response?.data?.error ?? err?.message ?? 'AI Summary generation failed.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Trigger Playbook manually
  const handleTriggerPlaybook = async () => {
    if (!id || !selectedPlaybookId) return;
    setIsPlaybookTriggering(true);
    try {
      await runPlaybookOnIncident(id, selectedPlaybookId);
      await fetchIncidentDetails();
    } catch (err: any) {
      console.error('Playbook execution error:', err);
      alert(err?.response?.data?.error ?? err?.message ?? 'Playbook execution failed.');
    } finally {
      setIsPlaybookTriggering(false);
    }
  };

  // Submit Note
  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !noteContent.trim()) return;
    setIsNoteSubmitting(true);
    try {
      await addIncidentNote(id, noteContent.trim());
      setNoteContent('');
      await fetchIncidentDetails();
    } catch (err: any) {
      console.error('Failed to add note:', err);
      alert(err?.response?.data?.error ?? err?.message ?? 'Failed to add note.');
    } finally {
      setIsNoteSubmitting(false);
    }
  };

  // Update incident priority, status, assignee
  const handleUpdateMetadata = async (updates: { status?: string; priority?: string; assignee?: string | null }) => {
    if (!id || !incident) return;
    setIsUpdatingMetadata(true);
    try {
      const updated = await updateIncident(id, updates);
      setIncident(updated);
      await fetchIncidentDetails();
    } catch (err: any) {
      console.error('Failed to update incident metadata:', err);
      alert(err?.response?.data?.error ?? err?.message ?? 'Failed to update metadata.');
    } finally {
      setIsUpdatingMetadata(false);
    }
  };

  // Approve action step
  const handleApproveAction = async (runId: string, stepIndex: number) => {
    if (!id) return;
    const loadKey = `${runId}-${stepIndex}`;
    setActionApprovalLoading(loadKey);
    try {
      await approveAction(id, runId, stepIndex);
      await fetchIncidentDetails();
    } catch (err: any) {
      console.error('Action approval failed:', err);
      alert(err?.response?.data?.error ?? err?.message ?? 'Failed to approve action.');
    } finally {
      setActionApprovalLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="op-card" style={{ padding: '4rem 1.5rem', textAlign: 'center', color: T.textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
        <Loader2 size={32} style={{ color: T.primary, animation: 'spin 1s linear infinite' }} />
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)' }}>Retrieving incident details...</span>
      </div>
    );
  }

  if (error || !incident) {
    return (
      <div className="op-card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '4rem auto' }}>
        <AlertCircle size={40} style={{ color: T.critical, marginBottom: '1.25rem', margin: '0 auto 1.25rem auto' }} />
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: '0.5rem' }}>Investigation System Offline</h3>
        <p style={{ color: T.textSecondary, fontSize: 'var(--text-sm)', marginBottom: '1.5rem', fontFamily: 'var(--font-display)', lineHeight: 1.5 }}>
          {error || 'Incident context not found.'}
        </p>
        <button
          onClick={() => navigate('/incidents')}
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
          }}
        >
          Return to Queue
        </button>
      </div>
    );
  }

  const linkedAlerts = incident.alerts?.map(ia => ia.alert) || [];

  const pendingActions: { runId: string; stepIndex: number; label: string; output: string }[] = [];
  incident.playbookRuns?.forEach(run => {
    if (run.status === 'RUNNING' && run.stepResults) {
      try {
        const results: StepResult[] = JSON.parse(run.stepResults);
        results.forEach(res => {
          if (res.status === 'PENDING_APPROVAL') {
            let label = `Step ${res.stepIndex + 1}`;
            if (run.playbook?.steps) {
              try {
                const stepsObj = JSON.parse(run.playbook.steps);
                const step = stepsObj.find((s: any) => s.index === res.stepIndex);
                if (step) label = step.label;
              } catch {}
            }
            pendingActions.push({
              runId: run.id,
              stepIndex: res.stepIndex,
              label,
              output: res.output
            });
          }
        });
      } catch {}
    }
  });

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: '1400px', margin: '0 auto', animation: 'fadeUp 0.4s ease both' }}>
      
      {/* Back button */}
      <button
        onClick={() => navigate('/incidents')}
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
        <ArrowLeft size={14} /> Return to Incident Queue
      </button>

      {/* Incident Header Panel */}
      <div className="op-card" style={{ padding: '24px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span className="badge" style={{
                borderColor: (priorityColors[incident.priority] || priorityColors.LOW).border,
                color: (priorityColors[incident.priority] || priorityColors.LOW).text,
                background: (priorityColors[incident.priority] || priorityColors.LOW).bg,
              }}>
                {incident.priority}
              </span>
              <span style={{ fontSize: 'var(--text-xs)', color: T.textSecondary, fontFamily: 'var(--font-mono)' }}>
                incident-id: {incident.id}
              </span>
            </div>
             {(() => {
              const { title: mainTitle, subtitle: rawAlerts } = formatIncidentTitleAndSubtitle(incident);
              return (
                <>
                  <h1
                    title={mainTitle}
                    style={{ fontSize: 'var(--text-xl)', fontWeight: 600, fontFamily: 'var(--font-display)', color: T.text, marginBottom: '8px' }}
                  >
                    {mainTitle}
                  </h1>
                  {rawAlerts && (
                    <div
                      title={rawAlerts}
                      style={{ fontSize: '12px', color: T.textMuted, fontFamily: 'var(--font-display)', marginBottom: '8px' }}
                    >
                      {rawAlerts}
                    </div>
                  )}
                </>
              );
            })()}
            <p style={{ color: T.textSecondary, fontSize: 'var(--text-sm)', maxWidth: '800px', lineHeight: 1.6, fontFamily: 'var(--font-display)' }}>
              {incident.description || 'No system operational briefing description provided.'}
            </p>
          </div>

          {/* Metadata Controls */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Status Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: T.textMuted, fontWeight: 600 }}>STATUS</label>
              <select
                value={incident.status}
                disabled={isUpdatingMetadata}
                onChange={(e) => handleUpdateMetadata({ status: e.target.value })}
                className="op-select"
                style={{ fontSize: 'var(--text-sm)', height: '36px', borderRadius: '6px' }}
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="FALSE_POSITIVE">False Positive</option>
              </select>
            </div>

            {/* Priority Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: T.textMuted, fontWeight: 600 }}>PRIORITY</label>
              <select
                value={incident.priority}
                disabled={isUpdatingMetadata}
                onChange={(e) => handleUpdateMetadata({ priority: e.target.value })}
                className="op-select"
                style={{ fontSize: 'var(--text-sm)', height: '36px', borderRadius: '6px' }}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </div>

            {/* Assignee Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '10px', fontFamily: 'var(--font-display)', textTransform: 'uppercase', color: T.textMuted, fontWeight: 600 }}>ASSIGNEE</label>
              <input
                type="text"
                placeholder="Unassigned"
                defaultValue={incident.assignee || ''}
                disabled={isUpdatingMetadata}
                className="op-input"
                style={{ fontSize: 'var(--text-sm)', height: '36px', width: '140px', borderRadius: '6px', fontFamily: 'var(--font-display)' }}
                onBlur={(e) => {
                  const val = e.target.value.trim();
                  if (val !== (incident.assignee || '')) {
                    handleUpdateMetadata({ assignee: val || null });
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = e.currentTarget.value.trim();
                    handleUpdateMetadata({ assignee: val || null });
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Layout: Main Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 1.2fr', gap: '2rem', alignItems: 'start', marginBottom: '3rem' }}>
        
        {/* Left Column (Investigation Main Console) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', minWidth: 0 }}>
          
          {/* Pending Response Actions (HUMAN GATES) */}
          {pendingActions.length > 0 && (
            <div className="op-card" style={{
              background: 'rgba(251, 113, 133, 0.02)',
              border: `1px solid rgba(251, 113, 133, 0.2)`,
              padding: '24px',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: T.critical, fontWeight: 600, fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)' }}>
                  <AlertCircle size={16} className="pulse-glow" style={{ color: T.critical }} />
                  Action Authorization Required ({pendingActions.length} Pending)
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pendingActions.map((act) => {
                  const loadKey = `${act.runId}-${act.stepIndex}`;
                  return (
                    <div
                      key={loadKey}
                      style={{
                        padding: '16px',
                        background: T.surfaceDeep,
                        border: `1px solid ${T.border}`,
                        borderRadius: '12px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: T.high, fontFamily: 'var(--font-display)', marginBottom: '8px' }}>
                          ⚡ Proposed Action: {act.label}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: T.textSecondary, fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.3)', padding: '12px', border: `1px solid ${T.border}`, borderRadius: '6px' }}>
                          {act.output}
                        </div>
                      </div>
                      <button
                        onClick={() => handleApproveAction(act.runId, act.stepIndex)}
                        disabled={actionApprovalLoading !== null}
                        style={{
                          background: T.criticalDim,
                          border: `1px solid ${T.critical}`,
                          color: T.critical,
                          borderRadius: '8px',
                          padding: '8px 16px',
                          fontFamily: 'var(--font-display)',
                          fontWeight: 500,
                          fontSize: '13px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        {actionApprovalLoading === loadKey ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Check size={12} />
                        )}
                        Authorize Action
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* AI Threat Summary Panel */}
          <div className="card-premium" style={{ padding: '24px', borderLeft: '3px solid #06b6d4' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={16} style={{ color: T.primary }} />
                <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, fontFamily: 'var(--font-display)', color: T.text }}>
                  AI Threat Summary
                </h3>
              </div>
              {incident.aiSummary && (
                <button
                  onClick={() => handleGenerateAiSummary(true)}
                  disabled={isAiGenerating}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${T.border}`,
                    color: T.textSecondary,
                    borderRadius: '6px',
                    padding: '6px 12px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 500,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {isAiGenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Re-generate
                </button>
              )}
            </div>

            {isAiGenerating ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2.5rem 0', gap: '8px' }}>
                <Loader2 size={24} style={{ color: T.primary, animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 'var(--text-sm)', fontFamily: 'var(--font-display)', color: T.textMuted }}>Running AI security assessment...</span>
              </div>
            ) : incident.aiSummary ? (
              <div style={{
                fontSize: 'var(--text-sm)',
                lineHeight: 1.6,
                color: T.text,
                background: T.surfaceDeep,
                border: `1px solid ${T.border}`,
                borderRadius: '12px',
                padding: '20px',
                whiteSpace: 'pre-line',
                fontFamily: 'var(--font-display)',
              }}>
                {incident.aiSummary}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <p style={{ color: T.textSecondary, fontSize: 'var(--text-sm)', marginBottom: '1.25rem', fontFamily: 'var(--font-display)' }}>
                  No automated assessment summary compiled for this incident sequence.
                </p>
                <button
                  onClick={() => handleGenerateAiSummary(false)}
                  style={{
                    background: T.primaryDim,
                    border: `1px solid ${T.primary}`,
                    color: T.primary,
                    borderRadius: '10px',
                    padding: '10px 20px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 500,
                    fontSize: 'var(--text-sm)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Sparkles size={14} />
                  Compile with SecOps Copilot
                </button>
              </div>
            )}
          </div>

          {/* Linked Alerts Section */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', borderLeft: `4px solid ${T.primary}`, paddingLeft: '12px' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, fontFamily: 'var(--font-display)', color: T.text }}>
                Correlated alerts ({linkedAlerts.length})
              </h3>
            </div>
            <AlertsTable alerts={linkedAlerts} />
          </div>

          {/* Incident Timeline Audit Logs */}
          <div className="op-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.5rem', borderLeft: `4px solid ${T.primary}`, paddingLeft: '12px' }}>
              <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, fontFamily: 'var(--font-display)', color: T.text }}>
                Incident activity timeline
              </h3>
            </div>

            <div style={{ position: 'relative', paddingLeft: '1.5rem', borderLeft: `1px dashed ${T.border}`, marginLeft: '10px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {incident.timeline && incident.timeline.length > 0 ? (
                incident.timeline.map((evt) => {
                  let badgeIcon = <Activity size={12} />;
                  let iconColor = T.primary;
                  let iconBg = T.primaryDim;
                  
                  if (evt.type === 'NOTE') {
                    badgeIcon = <MessageSquare size={12} />;
                    iconColor = T.medium;
                    iconBg = T.mediumDim;
                  } else if (evt.type === 'STATUS_CHANGE') {
                    badgeIcon = <Activity size={12} />;
                    iconColor = T.high;
                    iconBg = T.highDim;
                  } else if (evt.type === 'PLAYBOOK_RUN') {
                    badgeIcon = <Workflow size={12} />;
                    iconColor = T.primary;
                    iconBg = T.primaryDim;
                  } else if (evt.type === 'ACTION_APPROVED') {
                    badgeIcon = <CheckCircle2 size={12} />;
                    iconColor = T.low;
                    iconBg = T.lowDim;
                  }

                  return (
                    <div key={evt.id} style={{ position: 'relative' }}>
                      <span style={{
                        position: 'absolute',
                        left: '-2.1rem',
                        top: '2px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: T.bg,
                        border: `1px solid ${iconColor}`,
                        color: iconColor,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        {badgeIcon}
                      </span>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: 'var(--text-xs)', color: T.textSecondary, marginBottom: '6px', fontFamily: 'var(--font-display)' }}>
                          <span style={{ fontWeight: 600, color: T.text }}>{evt.author}</span>
                          <span>•</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} />
                            {new Date(evt.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).toLowerCase()}
                          </span>
                          <span style={{
                            background: iconBg,
                            border: `1px solid ${iconColor}40`,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: iconColor
                          }}>
                            {evt.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p style={{
                          fontSize: 'var(--text-sm)',
                          color: T.text,
                          background: evt.type === 'NOTE' ? T.surfaceDeep : 'transparent',
                          padding: evt.type === 'NOTE' ? '12px 16px' : '0',
                          border: evt.type === 'NOTE' ? `1px solid ${T.border}` : 'none',
                          borderRadius: '8px',
                          lineHeight: 1.55,
                          whiteSpace: 'pre-wrap',
                          fontFamily: evt.type === 'NOTE' ? 'var(--font-display)' : 'var(--font-mono)',
                        }}>
                          {evt.content}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ color: T.textMuted, fontSize: 'var(--text-sm)', fontFamily: 'var(--font-display)' }}>No timeline activity logged.</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Column (Control Panel & Actions) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minWidth: 0 }}>
          
          {/* Analyst Note Quick Form */}
          <div className="op-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: '12px', color: T.text }}>
              Append analyst note
            </h4>
            <form onSubmit={handleSubmitNote}>
              <textarea
                placeholder="Log observations, escalation instructions..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                disabled={isNoteSubmitting}
                className="op-input"
                style={{
                  width: '100%',
                  height: '110px',
                  fontSize: 'var(--text-sm)',
                  resize: 'none',
                  boxSizing: 'border-box',
                  marginBottom: '12px',
                  lineHeight: '1.5',
                  borderRadius: '8px',
                  fontFamily: 'var(--font-display)',
                }}
              />
              <button
                type="submit"
                disabled={isNoteSubmitting || !noteContent.trim()}
                style={{
                  width: '100%',
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
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                {isNoteSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                Append Note
              </button>
            </form>
          </div>

          {/* Trigger Playbook console */}
          <div className="card-premium" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: '12px', color: T.text }}>
              SOAR Orchestration
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <select
                value={selectedPlaybookId}
                onChange={(e) => setSelectedPlaybookId(e.target.value)}
                className="op-select"
                style={{ width: '100%', fontSize: 'var(--text-sm)', height: '36px', borderRadius: '6px' }}
              >
                {playbooks.map(pb => (
                  <option key={pb.id} value={pb.id}>{pb.name}</option>
                ))}
              </select>
              
              <button
                className="btn-primary"
                onClick={handleTriggerPlaybook}
                disabled={isPlaybookTriggering || !selectedPlaybookId}
              >
                {isPlaybookTriggering ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Play size={12} />
                )}
                Launch Playbook
              </button>
            </div>
          </div>

          {/* Active Playbook Execution Logs (Summary) */}
          <div className="op-card" style={{ padding: '20px' }}>
            <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: '12px', color: T.text }}>
              Automation History
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {incident.playbookRuns && incident.playbookRuns.length > 0 ? (
                incident.playbookRuns.map(run => {
                  let runStatusColor = T.primary;
                  
                  if (run.status === 'SUCCESS') {
                    runStatusColor = T.low;
                  } else if (run.status === 'FAILED') {
                    runStatusColor = T.critical;
                  } else if (run.status === 'SKIPPED') {
                    runStatusColor = T.textMuted;
                  }

                  return (
                    <div key={run.id} style={{
                      padding: '12px',
                      background: T.surfaceDeep,
                      border: `1px solid ${T.border}`,
                      borderRadius: '8px',
                      fontSize: 'var(--text-sm)',
                      fontFamily: 'var(--font-display)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', gap: '8px' }}>
                        <span style={{ fontWeight: 500, color: T.text, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                          {run.playbook?.name || 'Playbook'}
                        </span>
                        <span style={{
                          fontWeight: 600,
                          color: runStatusColor,
                          fontSize: '11px',
                          textTransform: 'uppercase',
                        }}>
                          {run.status}
                        </span>
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: T.textMuted, fontFamily: 'var(--font-mono)' }}>
                        run time: {new Date(run.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p style={{ color: T.textMuted, fontSize: 'var(--text-sm)', fontFamily: 'var(--font-display)' }}>
                  No playbook runs logged.
                </p>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
