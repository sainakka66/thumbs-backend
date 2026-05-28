import { apiJson } from './api';

export async function fetchSales() {
  const data = await apiJson('/sales');
  return Array.isArray(data) ? data : [];
}

export async function createSale(payload) {
  return apiJson('/sales', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteSale(id) {
  return apiJson(`/sales/${id}`, { method: 'DELETE' });
}
