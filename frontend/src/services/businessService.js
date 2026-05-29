import { apiJson, apiRequest, apiUrl, parseJsonResponse } from './api';
import { TOKEN_KEY } from '../config/env';

export function fetchExecutiveDashboard() {
  return apiJson('/dashboard/executive');
}

export function globalSearch(q) {
  return apiJson(`/search?q=${encodeURIComponent(q)}`);
}

export function fetchNotifications(unreadOnly = false) {
  return apiJson(`/notifications${unreadOnly ? '?unread=1' : ''}`);
}

export function markNotificationRead(id) {
  return apiJson(`/notifications/${id}/read`, { method: 'PATCH' });
}

export function markAllNotificationsRead() {
  return apiJson('/notifications/read-all', { method: 'POST' });
}

export function fetchStockAlerts() {
  return apiJson('/stock-alerts');
}

export function syncStockAlerts() {
  return apiJson('/stock-alerts/sync', { method: 'POST' });
}

export function fetchAuditLogs(params = {}) {
  const qs = new URLSearchParams(params).toString();
  return apiJson(`/audit/logs${qs ? `?${qs}` : ''}`);
}

export function fetchRbacMe() {
  return apiJson('/rbac/me');
}

export async function fetchReport(type, { range = 'month', from, to, format = 'json' } = {}) {
  const qs = new URLSearchParams({ range, format });
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const path = `/reports/${type}?${qs}`;
  if (format === 'csv' || format === 'excel') {
    const res = await apiRequest(path);
    if (!res.ok) throw new Error('Export failed');
    return res.text();
  }
  return apiJson(path);
}

export async function downloadPdf(path, filename) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(apiUrl(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('PDF download failed');
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
