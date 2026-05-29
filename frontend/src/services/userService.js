import { apiJson } from './api';

export function fetchUsers(includeDeleted = false) {
  return apiJson(`/users${includeDeleted ? '?includeDeleted=1' : ''}`);
}

export function fetchUser(id) {
  return apiJson(`/users/${id}`);
}

export function fetchRoles() {
  return apiJson('/users/roles/list');
}

export function createUser(payload) {
  return apiJson('/users', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateUser(id, payload) {
  return apiJson(`/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
}

export function patchUserStatus(id, payload) {
  return apiJson(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function resetUserPassword(id, password) {
  return apiJson(`/users/${id}/reset-password`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  });
}

export function deleteUser(id) {
  return apiJson(`/users/${id}`, { method: 'DELETE' });
}

export function changePassword(currentPassword, newPassword) {
  return apiJson('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
