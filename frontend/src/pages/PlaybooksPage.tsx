import { useState, useEffect } from 'react';
import { getPlaybooks, togglePlaybook, deletePlaybook, createPlaybook } from '../api/client';
import type { Playbook, PlaybookStep } from '../types';
import {
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  PlusCircle,
  X,
  Check,
  BookOpen
} from 'lucide-react';

const STEP_TYPES = [
  { value: 'AI_SUMMARY', label: 'Generate AI Assessment (SecOps Copilot)', requiresApproval: false },
  { value: 'NOTIFY_SLACK', label: 'Transmit Slack Payload', requiresApproval: false },
  { value: 'SEND_EMAIL', label: 'Dispatch SMTP Security Email', requiresApproval: false },
  { value: 'CREATE_INCIDENT', label: 'Queue Incident', requiresApproval: false },
  { value: 'ESCALATE_PRIORITY', label: 'Upgrade Target To Critical', requiresApproval: false },
  { value: 'ADD_NOTE', label: 'Append Audit Log Note', requiresApproval: false },
  { value: 'BLOCK_IP', label: 'Enforce Firewall IP Block', requiresApproval: true },
  { value: 'ISOLATE_ENDPOINT', label: 'Command Host Isolation', requiresApproval: true },
  { value: 'CREATE_TICKET', label: 'Spawn Support Ticket', requiresApproval: true },
];

const TRIGGER_TYPES = [
  { value: 'BRUTE_FORCE', label: 'Brute Force Signature' },
  { value: 'ACCOUNT_COMPROMISE', label: 'Account Compromise Flag' },
  { value: 'MALWARE_PROCESS_CHAIN', label: 'Malware Process Sequence' },
  { value: 'PORT_SCAN', label: 'Firewall Scan Detection' },
  { value: 'HONEYPOT_TARGET', label: 'Honeypot Username Flag' },
  { value: 'MANUAL', label: 'Manual Console Execution' },
];

const T = {
  bg:           "#080d16",
  surface:      "#0e1623",
  surfaceHover: "#121d2e",
  surfaceDeep:  "#060a10",
  border:       "rgba(255,255,255,0.06)",
  borderHover:  "rgba(255,255,255,0.11)",
  primary:      "#818cf8",
  primaryDim:   "rgba(129,140,248,0.12)",
  critical:     "#fb7185",
  text:         "#f1f5f9",
  textSecondary:"#94a3b8",
  textMuted:    "#475569",
};

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Accordion state
  const [expandedPlaybookId, setExpandedPlaybookId] = useState<string | null>(null);

  // Builder Modal State
  const [showBuilder, setShowBuilder] = useState(false);
  const [newPlaybookName, setNewPlaybookName] = useState('');
  const [newPlaybookDesc, setNewPlaybookDesc] = useState('');
  const [newPlaybookTrigger, setNewPlaybookTrigger] = useState('BRUTE_FORCE');
  const [newPlaybookSteps, setNewPlaybookSteps] = useState<Omit<PlaybookStep, 'index'>[]>([
    { type: 'AI_SUMMARY', label: 'Generate AI Threat Assessment', requiresApproval: false }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPlaybooksData = async () => {
    setError(null);
    try {
      const data = await getPlaybooks();
      setPlaybooks(data);
    } catch (err: any) {
      console.error('Failed to load playbooks:', err);
      setError(err?.response?.data?.error ?? err?.message ?? 'Failed to load playbooks.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaybooksData();
  }, []);

  const handleTogglePlaybook = async (id: string, currentEnabled: boolean) => {
    try {
      await togglePlaybook(id, !currentEnabled);
      setPlaybooks(playbooks.map(pb => pb.id === id ? { ...pb, enabled: !currentEnabled } : pb));
    } catch (err: any) {
      console.error('Failed to toggle playbook status:', err);
      alert('Failed to toggle status.');
    }
  };

  const handleDeletePlaybook = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this automation runbook?')) return;
    try {
      await deletePlaybook(id);
      setPlaybooks(playbooks.filter(pb => pb.id !== id));
      if (expandedPlaybookId === id) setExpandedPlaybookId(null);
    } catch (err: any) {
      console.error('Failed to delete playbook:', err);
      alert('Failed to delete playbook.');
    }
  };

  const handleAddBuilderStep = () => {
    setNewPlaybookSteps([
      ...newPlaybookSteps,
      { type: 'NOTIFY_SLACK', label: 'Slack Log Notification', requiresApproval: false }
    ]);
  };

  const handleRemoveBuilderStep = (idxToRemove: number) => {
    setNewPlaybookSteps(newPlaybookSteps.filter((_, i) => i !== idxToRemove));
  };

  const handleUpdateBuilderStep = (idx: number, fields: Partial<Omit<PlaybookStep, 'index'>>) => {
    setNewPlaybookSteps(newPlaybookSteps.map((step, i) => {
      if (i === idx) {
        let requiresApproval = step.requiresApproval;
        if (fields.type) {
          const typeDefault = STEP_TYPES.find(t => t.value === fields.type);
          requiresApproval = typeDefault ? typeDefault.requiresApproval : false;
        }
        return { ...step, ...fields, requiresApproval: fields.requiresApproval !== undefined ? fields.requiresApproval : requiresApproval };
      }
      return step;
    }));
  };

  const handleCreatePlaybookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlaybookName.trim() || newPlaybookSteps.length === 0) {
      alert('Playbook Name and at least one step are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formattedSteps: PlaybookStep[] = newPlaybookSteps.map((step, index) => ({
        index,
        ...step
      }));

      await createPlaybook({
        name: newPlaybookName.trim(),
        description: newPlaybookDesc.trim() || null,
        trigger: newPlaybookTrigger,
        steps: formattedSteps,
        enabled: true,
      });

      setNewPlaybookName('');
      setNewPlaybookDesc('');
      setNewPlaybookTrigger('BRUTE_FORCE');
      setNewPlaybookSteps([{ type: 'AI_SUMMARY', label: 'Generate AI Threat Assessment', requiresApproval: false }]);
      setShowBuilder(false);
      
      await fetchPlaybooksData();
    } catch (err: any) {
      console.error('Failed to create playbook:', err);
      alert(err?.response?.data?.error ?? err?.message ?? 'Failed to build playbook.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Header section */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
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
            Response Playbooks
          </h2>
        </div>
        
        <button
          className="btn-primary"
          onClick={() => setShowBuilder(true)}
        >
          <Plus size={14} />
          New Blueprint
        </button>
      </div>

      <p style={{ color: T.textSecondary, fontSize: '14.5px', marginBottom: '2rem', fontFamily: 'var(--font-display)', lineHeight: 1.6, maxWidth: '900px' }}>
        Response playbooks are automated runbooks that define step-by-step orchestrations when security incidents are detected. They automate initial triage, threat intelligence gathering, notifications, and containment actions (such as blocking IPs or isolating endpoints). By setting up playbooks, security operation centers can standardise their incident response workflows, reduce dwell time, and ensure consistent containment procedures.
      </p>

      {/* Error banner */}
      {error && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '12px 16px', marginBottom: '1.5rem', borderRadius: '8px',
          background: 'rgba(251, 113, 133, 0.08)', border: `1px solid rgba(251, 113, 133, 0.25)`,
          color: T.critical, fontSize: '13px', fontFamily: 'var(--font-display)',
        }}>
          <span>Error: {error}</span>
        </div>
      )}

      {/* Playbooks list container */}
      {isLoading ? (
        <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center', color: T.textSecondary, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Loader2 size={24} style={{ color: T.primary }} className="animate-spin" />
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '14px' }}>Loading runbooks...</p>
        </div>
      ) : playbooks.length === 0 ? (
        <div className="card-premium rounded-xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-[#06b6d4]/10 flex items-center justify-center mb-5 opacity-40">
            <BookOpen size={32} className="text-[#06b6d4]" />
          </div>
          <p className="text-[#475569] text-sm font-medium">No playbooks configured</p>
          <p className="text-[#334155] text-xs mt-1">Upload a playbook or define automation workflows to get started.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {playbooks.map((pb, idx) => {
            let parsedSteps: PlaybookStep[] = [];
            try {
              parsedSteps = JSON.parse(pb.steps);
            } catch {}

            const isExpanded = expandedPlaybookId === pb.id;

            return (
              <div
                key={pb.id}
                className="card-premium"
                style={{
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  animation: 'fadeUp 0.4s ease both',
                  animationDelay: `${idx * 40}ms`,
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHover}
                onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
              >
                {/* Top Row: Playbook Name + Trigger Badge + Enabled Toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '16px',
                      fontWeight: 600,
                      color: T.text,
                    }}>
                      {pb.name}
                    </span>
                    <span className="badge" style={{
                      background: T.primaryDim,
                      color: T.primary,
                      borderColor: T.primary,
                    }}>
                      ON {pb.trigger}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                      onClick={() => handleTogglePlaybook(pb.id, pb.enabled)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: pb.enabled ? T.primary : T.textMuted,
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0,
                      }}
                    >
                      {pb.enabled ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                    </button>
                  </div>
                </div>

                {/* Second Row: Description */}
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '14px',
                  color: T.textSecondary,
                  lineHeight: 1.6,
                  margin: 0
                }}>
                  {pb.description || 'No blueprint description provided.'}
                </p>

                {/* Bottom Row: Steps label count + Action icons */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '4px',
                  borderTop: `1px solid ${T.border}`,
                  paddingTop: '12px'
                }}>
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '12px',
                    color: T.textMuted
                  }}>
                    {parsedSteps.length} steps configured
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* View steps Chevron */}
                    <button
                      onClick={() => setExpandedPlaybookId(isExpanded ? null : pb.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: T.textSecondary,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'var(--font-display)',
                        fontSize: '13px',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = T.text}
                      onMouseLeave={e => e.currentTarget.style.color = T.textSecondary}
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      {isExpanded ? 'Hide Steps' : 'View Steps'}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeletePlaybook(pb.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: T.textSecondary,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = T.critical}
                      onMouseLeave={e => e.currentTarget.style.color = T.textSecondary}
                      title="Delete Blueprint"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Steps Details Inline (Expanded view) */}
                {isExpanded && (
                  <div style={{
                    marginTop: '8px',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: T.surfaceDeep,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {parsedSteps.map((step) => {
                      return (
                        <div
                          key={step.index}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '8px 12px',
                            background: T.surface,
                            border: `1px solid ${T.border}`,
                            borderRadius: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              width: '18px',
                              height: '18px',
                              borderRadius: '50%',
                              background: T.primaryDim,
                              fontSize: '11px',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: T.primary,
                              border: `1px solid ${T.primary}`,
                            }}>
                              {step.index + 1}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: T.text, fontFamily: 'var(--font-display)' }}>
                              {step.label}
                            </span>
                          </div>

                          {step.requiresApproval && (
                            <span className="badge badge--high" style={{ fontSize: '10px' }}>
                              requires approval
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>
            );
          })}

          {/* Subtle "No additional blueprints configured" card at the bottom */}
          <div style={{
            textAlign: 'center',
            padding: '2rem 1.5rem',
            color: T.textMuted,
            border: `1px dashed ${T.border}`,
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.01)',
            marginTop: '1.5rem',
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '13px', color: T.textSecondary, fontWeight: 500 }}>
              No additional blueprints configured
            </span>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: '12px', color: T.textMuted, marginTop: '4px', margin: '4px 0 0 0' }}>
              Create custom SOAR orchestrations for other security telemetry vectors as your environment scales.
            </p>
          </div>
        </div>
      )}

      {/* Playbook Builder Modal */}
      {showBuilder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(8, 13, 22, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            width: '600px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            borderRadius: '16px',
            border: `1px solid ${T.border}`,
            background: T.surface,
          }}>
            {/* Modal Head */}
            <div style={{
              padding: '16px 20px',
              borderBottom: `1px solid ${T.border}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'var(--font-display)', color: T.text }}>
                Create Response Playbook
              </h3>
              <button
                onClick={() => setShowBuilder(false)}
                style={{ background: 'none', border: 'none', color: T.textSecondary, cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreatePlaybookSubmit} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '20px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '60vh', boxSizing: 'border-box' }}>
                
                {/* Playbook name */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-display)', color: T.textSecondary }}>Playbook Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Brute Force Mitigation Runbook"
                    value={newPlaybookName}
                    onChange={(e) => setNewPlaybookName(e.target.value)}
                    className="op-input"
                    style={{ fontSize: '13px' }}
                  />
                </div>

                {/* Playbook Description */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-display)', color: T.textSecondary }}>Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Automatically generate threat assessment, dispatch Slack notifications, and block IP"
                    value={newPlaybookDesc}
                    onChange={(e) => setNewPlaybookDesc(e.target.value)}
                    className="op-input"
                    style={{ fontSize: '13px' }}
                  />
                </div>

                {/* Trigger Select */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-display)', color: T.textSecondary }}>Trigger Condition</label>
                  <select
                    value={newPlaybookTrigger}
                    onChange={(e) => setNewPlaybookTrigger(e.target.value)}
                    className="op-select"
                    style={{ fontSize: '13px' }}
                  >
                    {TRIGGER_TYPES.map(trig => (
                      <option key={trig.value} value={trig.value}>{trig.label} (ON_{trig.value})</option>
                    ))}
                  </select>
                </div>

                {/* Steps Builder */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '12px', fontWeight: 500, fontFamily: 'var(--font-display)', color: T.textSecondary }}>Steps Configuration</label>
                    <button
                      type="button"
                      onClick={handleAddBuilderStep}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: T.primary,
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      <PlusCircle size={14} /> Add Step
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {newPlaybookSteps.map((step, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '12px',
                          background: T.surfaceDeep,
                          border: `1px solid ${T.border}`,
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          position: 'relative',
                        }}
                      >
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveBuilderStep(idx)}
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            background: 'none',
                            border: 'none',
                            color: T.textMuted,
                            cursor: 'pointer',
                          }}
                        >
                          <X size={16} />
                        </button>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '12px' }}>
                          {/* Step Type */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: T.textSecondary }}>Action</label>
                            <select
                              value={step.type}
                              onChange={(e) => handleUpdateBuilderStep(idx, { type: e.target.value })}
                              className="op-select"
                              style={{ fontSize: '12px' }}
                            >
                              {STEP_TYPES.map(st => (
                                <option key={st.value} value={st.value}>{st.value}</option>
                              ))}
                            </select>
                          </div>

                          {/* Step Label */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '11px', color: T.textSecondary }}>Label</label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. Notify Slack Team"
                              value={step.label}
                              onChange={(e) => handleUpdateBuilderStep(idx, { label: e.target.value })}
                              className="op-input"
                              style={{ fontSize: '12px' }}
                            />
                          </div>
                        </div>

                        {/* Requires Approval Checkbox */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input
                            type="checkbox"
                            id={`app-chk-${idx}`}
                            checked={step.requiresApproval || false}
                            onChange={(e) => handleUpdateBuilderStep(idx, { requiresApproval: e.target.checked })}
                            style={{ cursor: 'pointer' }}
                          />
                          <label htmlFor={`app-chk-${idx}`} style={{ fontSize: '12px', color: T.textSecondary, cursor: 'pointer' }}>
                            Enforce manual authorization before execution
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Modal footer */}
              <div style={{
                padding: '12px 20px',
                borderTop: `1px solid ${T.border}`,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '8px',
                background: T.surfaceDeep,
              }}>
                <button
                  type="button"
                  onClick={() => setShowBuilder(false)}
                  style={{
                    background: 'none',
                    border: `1px solid ${T.border}`,
                    color: T.textSecondary,
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    background: T.primaryDim,
                    border: `1px solid ${T.primary}`,
                    color: T.primary,
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  Compile Blueprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
