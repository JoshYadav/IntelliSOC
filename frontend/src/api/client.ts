import axios from 'axios';
import type { UploadResponse, Alert, AnalyticsData, Session, Incident, Playbook, PlaybookStep, Endpoint, EndpointTelemetry, CorrelationData } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
});

export async function uploadLogFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('logfile', file);

  const { data } = await api.post<UploadResponse>('/logs/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function getSessions(): Promise<Session[]> {
  const { data } = await api.get<Session[]>('/sessions');
  return data;
}

export async function getCorrelations(): Promise<CorrelationData[]> {
  const { data } = await api.get<CorrelationData[]>('/correlations');
  return data;
}

export async function getAlerts(sessionId: string, filters?: { severity?: string; type?: string }): Promise<Alert[]> {
  const params = new URLSearchParams();
  if (filters?.severity) params.set('severity', filters.severity);
  if (filters?.type) params.set('type', filters.type);

  const { data } = await api.get<Alert[]>(`/session/${sessionId}/alerts?${params.toString()}`);
  return data;
}

export async function getAnalytics(sessionId: string): Promise<AnalyticsData> {
  const { data } = await api.get<AnalyticsData>(`/session/${sessionId}/analytics`);
  return data;
}

export async function downloadReport(sessionId: string): Promise<void> {
  console.log('Triggering strict blob download for session:', sessionId);
  const cacheBuster = Date.now();
  const response = await fetch(`${API_BASE}/api/session/${sessionId}/report?_t=${cacheBuster}`);
  if (!response.ok) {
    throw new Error('Failed to fetch report');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.style.display = 'none';
  a.download = 'report.csv'; // Ensure filename is strictly report.csv
  a.href = url;
  
  document.body.appendChild(a);
  a.click();
  
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

// ── SOAR: Incidents ───────────────────────────────────────────────────────────

export async function getIncidents(filters?: { status?: string; priority?: string }): Promise<Incident[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.priority) params.set('priority', filters.priority);
  const { data } = await api.get<Incident[]>(`/incidents?${params.toString()}`);
  return data;
}

export async function getIncident(id: string): Promise<Incident> {
  const { data } = await api.get<Incident>(`/incidents/${id}`);
  return data;
}

export async function updateIncident(id: string, updates: { status?: string; priority?: string; assignee?: string | null }): Promise<Incident> {
  const { data } = await api.patch<Incident>(`/incidents/${id}`, updates);
  return data;
}

export async function addIncidentNote(id: string, content: string): Promise<void> {
  await api.post(`/incidents/${id}/notes`, { content });
}

export async function getAiSummary(id: string, force = false): Promise<string> {
  const { data } = await api.get<{ summary: string }>(`/incidents/${id}/ai-summary${force ? '?force=true' : ''}`);
  return data.summary;
}

export async function runPlaybookOnIncident(incidentId: string, playbookId: string): Promise<{ runId: string }> {
  const { data } = await api.post(`/incidents/${incidentId}/playbooks/${playbookId}/run`);
  return data;
}

export async function approveAction(incidentId: string, runId: string, stepIndex: number): Promise<void> {
  await api.post(`/incidents/${incidentId}/actions/${runId}/approve`, { stepIndex });
}

// ── SOAR: Alert Status ────────────────────────────────────────────────────────

export async function updateAlertStatus(alertId: number, status: string): Promise<void> {
  await api.patch(`/alerts/${alertId}/status`, { status });
}

export async function bulkUpdateAlertStatus(alertIds: number[], status: string): Promise<{ updated: number }> {
  const { data } = await api.patch<{ updated: number }>('/alerts/bulk-status', { alertIds, status });
  return data;
}

// ── SOAR: Playbooks ──────────────────────────────────────────────────────────

export async function getPlaybooks(): Promise<Playbook[]> {
  const { data } = await api.get<Playbook[]>('/playbooks');
  return data;
}

export async function getPlaybook(id: string): Promise<Playbook> {
  const { data } = await api.get<Playbook>(`/playbooks/${id}`);
  return data;
}

export async function togglePlaybook(id: string, enabled: boolean): Promise<void> {
  await api.patch(`/playbooks/${id}`, { enabled });
}

export async function deletePlaybook(id: string): Promise<void> {
  await api.delete(`/playbooks/${id}`);
}

export async function createPlaybook(playbook: { name: string; description: string | null; trigger: string; steps: PlaybookStep[]; enabled: boolean }): Promise<Playbook> {
  const { data } = await api.post<Playbook>('/playbooks', playbook);
  return data;
}

export async function updatePlaybook(id: string, updates: { name?: string; description?: string | null; trigger?: string; steps?: PlaybookStep[]; enabled?: boolean }): Promise<Playbook> {
  const { data } = await api.patch<Playbook>(`/playbooks/${id}`, updates);
  return data;
}

// ── EDR: Endpoints ────────────────────────────────────────────────────────────

export async function getEndpoints(): Promise<Endpoint[]> {
  const { data } = await api.get<Endpoint[]>('/endpoints');
  return data;
}

export async function getEndpointDetail(id: string): Promise<Endpoint> {
  const { data } = await api.get<Endpoint>(`/endpoints/${id}`);
  return data;
}

export async function isolateHost(id: string): Promise<Endpoint> {
  const { data } = await api.post<{ message: string; endpoint: Endpoint }>(`/endpoints/${id}/isolate`);
  return data.endpoint;
}

export async function unisolateHost(id: string): Promise<Endpoint> {
  const { data } = await api.post<{ message: string; endpoint: Endpoint }>(`/endpoints/${id}/unisolate`);
  return data.endpoint;
}

export async function getEndpointTelemetry(
  id: string,
  type: 'processes' | 'network' | 'files',
  limit = 50
): Promise<EndpointTelemetry[]> {
  const { data } = await api.get<EndpointTelemetry[]>(`/endpoints/${id}/${type}?limit=${limit}`);
  return data;
}

export async function getEndpointAlerts(id: string): Promise<Alert[]> {
  const { data } = await api.get<Alert[]>(`/endpoints/${id}/alerts`);
  return data;
}


