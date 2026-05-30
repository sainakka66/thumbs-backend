import { apiJson, apiRequest, apiUrl, parseJsonResponse } from './api';
import { TOKEN_KEY } from '../config/env';

function emptyExecutiveDashboard() {
  return {
    todaySales: { count: 0, total: 0 },
    weeklySales: [],
    monthlySales: 0,
    revenue: { today: 0, week: 0, month: 0 },
    topProducts: [],
    lowStockProducts: [],
    deliveries: { pending: 0, completed: 0 },
    customers: { total: 0, active: 0 },
    charts: {
      salesTrend: [],
      revenueTrend: [],
      productPerformance: [],
      deliveryPerformance: [],
    },
  };
}

/** Normalize executive dashboard payload — never assume arrays from API. */
export function normalizeExecutiveDashboard(raw) {
  if (!raw || typeof raw !== 'object') return emptyExecutiveDashboard();
  const charts = raw.charts && typeof raw.charts === 'object' ? raw.charts : {};
  const weeklySales = Array.isArray(raw.weeklySales) ? raw.weeklySales : [];
  return {
    ...raw,
    weeklySales,
    topProducts: Array.isArray(raw.topProducts) ? raw.topProducts : [],
    lowStockProducts: Array.isArray(raw.lowStockProducts) ? raw.lowStockProducts : [],
    charts: {
      salesTrend: Array.isArray(charts.salesTrend) ? charts.salesTrend : [],
      revenueTrend: Array.isArray(charts.revenueTrend) ? charts.revenueTrend : [],
      productPerformance: Array.isArray(charts.productPerformance) ? charts.productPerformance : [],
      deliveryPerformance: Array.isArray(charts.deliveryPerformance) ? charts.deliveryPerformance : [],
    },
  };
}

export async function fetchExecutiveDashboard() {
  try {
    const raw = await apiJson('/dashboard/executive');
    return normalizeExecutiveDashboard(raw);
  } catch {
    return emptyExecutiveDashboard();
  }
}

/**
 * Single aggregated dashboard request — replaces executive + admin + notifications.
 * Returns normalized executive shape plus optional `admin` block and `unreadNotifications`.
 */
export async function fetchDashboardSummary() {
  const raw = await apiJson('/dashboard/summary');
  const base = normalizeExecutiveDashboard(raw);
  return {
    ...base,
    inventory: raw?.inventory || { totalProducts: 0, totalStock: 0, lowStock: 0, totalValue: 0 },
    alerts: raw?.alerts || { lowStockCount: 0 },
    unreadNotifications: Number(raw?.unreadNotifications || 0),
    ordersTotal: Number(raw?.ordersTotal || 0),
    deliveriesTotal: Number(raw?.deliveriesTotal || 0),
    recentOrders: Array.isArray(raw?.recentOrders) ? raw.recentOrders : [],
    admin: raw?.admin || null,
  };
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

export function fetchAdminDashboard() {
  return apiJson('/dashboard/admin');
}

export async function exportAuditCsv(params = {}) {
  const qs = new URLSearchParams({ ...params, format: 'csv', limit: '500' }).toString();
  const { apiRequest } = await import('./api');
  const res = await apiRequest(`/audit/logs?${qs}`);
  if (!res.ok) throw new Error('Export failed');
  return res.text();
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
