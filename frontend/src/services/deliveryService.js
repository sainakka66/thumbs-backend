import { apiJson } from './api';

export async function fetchDeliveries(status = '') {
  const path = status
    ? `/deliveries?status=${encodeURIComponent(status)}`
    : '/deliveries';
  const data = await apiJson(path);
  return Array.isArray(data) ? data : [];
}

export async function createDelivery(payload) {
  return apiJson('/deliveries', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteDelivery(id) {
  return apiJson(`/deliveries/${id}`, { method: 'DELETE' });
}
