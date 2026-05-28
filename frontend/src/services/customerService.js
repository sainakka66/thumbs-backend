import { apiJson } from './api';
import { mapCustomerFromApi } from '../lib/customers';

export async function fetchCustomers() {
  const data = await apiJson('/customers');
  if (!Array.isArray(data)) return [];
  return data.map(mapCustomerFromApi);
}

export async function createCustomer(payload) {
  return apiJson('/customers', { method: 'POST', body: JSON.stringify(payload) });
}

export async function deleteCustomer(id) {
  return apiJson(`/customers/${id}`, { method: 'DELETE' });
}

export async function recordPayment(customerId, amount) {
  return apiJson(`/customers/${customerId}/pay`, {
    method: 'POST',
    body: JSON.stringify({ amount }),
  });
}
