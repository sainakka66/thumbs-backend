/**
 * API base URL
 * - Production (Vercel): full Render URL (VITE_API_BASE_URL)
 * - Development: /api → Vite proxy rewrites to Render (avoids /login route clash)
 * - Dev direct: VITE_USE_DIRECT_API=true + VITE_API_BASE_URL
 */
const RENDER_API = 'https://thumbs-backend.onrender.com';
const DEV_PROXY_PREFIX = '/api';

const directFromEnv = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

export const API_BASE_URL = import.meta.env.PROD
  ? (directFromEnv || RENDER_API)
  : import.meta.env.VITE_USE_DIRECT_API === 'true'
    ? directFromEnv || RENDER_API
    : DEV_PROXY_PREFIX;

export const APP_NAME = 'Thumbs Up';
export const TOKEN_KEY = 'token';
export const PERMISSIONS_KEY = 'permissions';
export const ROLE_KEY = 'role';

export const isDevProxy =
  import.meta.env.DEV && API_BASE_URL === DEV_PROXY_PREFIX;

if (import.meta.env.DEV) {
  console.info('[API] mode:', isDevProxy ? 'vite-proxy (/api → Render)' : 'direct → Render');
  console.info('[API] base URL:', API_BASE_URL);
}
