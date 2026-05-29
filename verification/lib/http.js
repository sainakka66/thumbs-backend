const { API_BASE } = require('./config');

async function request(method, path, { token, body, headers = {}, timeoutMs = 15000 } = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const start = Date.now();

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    signal: ctrl.signal,
  };
  if (token) opts.headers.Authorization = `Bearer ${token}`;
  if (body != null && method !== 'GET') opts.body = JSON.stringify(body);

  try {
    const res = await fetch(url, opts);
    clearTimeout(timer);
    const elapsed = Date.now() - start;
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { ok: res.ok, status: res.status, data, elapsed, url };
  } catch (err) {
    clearTimeout(timer);
    return {
      ok: false,
      status: 0,
      data: null,
      elapsed: Date.now() - start,
      error: err.message,
      url,
    };
  }
}

async function login(username, password) {
  const res = await request('POST', '/login', { body: { username, password } });
  if (!res.ok || !res.data?.token) {
    return { success: false, error: res.data?.message || res.error || `HTTP ${res.status}`, ...res };
  }
  return {
    success: true,
    token: res.data.token,
    role: res.data.role,
    permissions: res.data.permissions || [],
    ...res,
  };
}

async function healthCheck() {
  const res = await request('GET', '/health');
  return res.ok && res.data?.ok;
}

module.exports = { request, login, healthCheck };
