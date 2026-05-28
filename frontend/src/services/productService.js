import { apiJson } from './api';
import { mapProductFromApi } from '../lib/products';

export async function fetchProducts(page = 1, search = '') {
  const path = search
    ? `/products/search/${encodeURIComponent(search)}?page=${page}`
    : `/products?page=${page}`;
  const data = await apiJson(path);
  if (!Array.isArray(data)) return [];
  return data.map(mapProductFromApi);
}

export async function fetchProductStats() {
  return apiJson('/products/stats');
}

export async function createProduct(payload) {
  return apiJson('/products', { method: 'POST', body: JSON.stringify(payload) });
}

export async function updateProduct(id, payload) {
  return apiJson(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export async function deleteProduct(id) {
  return apiJson(`/products/${id}`, { method: 'DELETE' });
}
