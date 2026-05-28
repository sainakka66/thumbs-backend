import { API_BASE_URL, TOKEN_KEY } from '../config/env';

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export function apiUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  const base = API_BASE_URL;
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

function logApiFailure(method, url, err, extra = {}) {
  console.error('[API] request failed', {
    method: method || 'GET',
    url,
    message: err?.message,
    ...extra,
  });
}

/**
 * Parse response body; never blindly JSON.parse HTML error pages.
 */
export async function parseJsonResponse(res, url) {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  if (import.meta.env.DEV) {
    console.debug('[API] response', {
      url,
      status: res.status,
      contentType: contentType.slice(0, 60),
      preview: text.slice(0, 80),
    });
  }

  const looksLikeHtml = text.trimStart().startsWith('<');

  if (looksLikeHtml) {
    logApiFailure('GET', url, new Error('HTML response'), {
      status: res.status,
      hint:
        'Received index.html instead of API JSON. Local dev should use /api prefix (Vite proxy).',
      preview: text.slice(0, 120),
    });
    throw new ApiError(
      'API returned HTML instead of JSON. Check Vite proxy (/api) or VITE_API_BASE_URL.',
      res.status
    );
  }

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    logApiFailure('GET', url, new Error('Invalid JSON'), { body: text.slice(0, 200) });
    throw new ApiError('Invalid JSON from API', res.status, text);
  }
}

export async function apiRequest(path, options = {}) {
  const url = apiUrl(path);
  const method = options.method || 'GET';
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  if (import.meta.env.DEV) {
    console.debug('[API] →', method, url);
  }

  let res;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err) {
    logApiFailure(method, url, err, {
      hint:
        err?.message === 'Failed to fetch'
          ? 'Network/CORS or proxy not running'
          : undefined,
    });
    throw new ApiError(
      err?.message === 'Failed to fetch'
        ? 'Cannot reach API server. Check network, CORS, or Vite proxy (/api).'
        : err?.message || 'Network error',
      0
    );
  }

  if (res.status === 401) {
    localStorage.removeItem(TOKEN_KEY);
    window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    throw new ApiError('Session expired. Please sign in again.', 401);
  }

  return res;
}

export async function apiJson(path, options = {}) {
  const url = apiUrl(path);
  const res = await apiRequest(path, options);
  const data = await parseJsonResponse(res, url);

  if (!res.ok) {
    const message =
      (data && (data.message || data.error)) || `Request failed (${res.status})`;
    console.warn('[API] error response', { url, status: res.status, data });
    throw new ApiError(message, res.status, data);
  }
  return data;
}
