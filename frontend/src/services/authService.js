import { apiRequest, apiUrl, parseJsonResponse } from './api';

export async function login(username, password) {
  const url = apiUrl('/login');
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
  } catch (err) {
    console.error('[API] login failed', { url, message: err?.message });
    throw new Error(
      err?.message === 'Failed to fetch'
        ? 'Cannot reach API server. Check Vite proxy (/api) or network.'
        : err?.message || 'Sign in failed'
    );
  }

  const data = await parseJsonResponse(res, url);

  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Sign in failed');
  }
  return data;
}

export async function logout() {
  try {
    await apiRequest('/logout', { method: 'POST' });
  } catch {
    /* best-effort */
  }
}
