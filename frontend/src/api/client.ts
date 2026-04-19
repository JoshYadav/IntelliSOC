import axios from 'axios';
import type { UploadResponse, Alert, AnalyticsData, Session } from '../types';

const api = axios.create({
  baseURL: '/api',
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
  const response = await fetch(`/api/session/${sessionId}/report?_t=${cacheBuster}`);
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
