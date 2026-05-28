import { apiJson } from './api';

export async function fetchRecentSales() {
  const data = await apiJson('/dashboard/recent-sales');
  return Array.isArray(data) ? data : [];
}

export async function fetchTopCustomers() {
  const data = await apiJson('/dashboard/top-customers');
  return Array.isArray(data) ? data : [];
}

export async function fetchTodayRevenue() {
  return apiJson('/dashboard/today-revenue');
}

export async function fetchWeeklySales() {
  const data = await apiJson('/dashboard/weekly-sales');
  return Array.isArray(data) ? data : [];
}
