import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const RENDER_API = 'https://thumbs-backend.onrender.com';

/**
 * Dev-only: proxy /api/* → Render (strip /api prefix).
 * Avoids collision with React Router routes like /login, /sales, etc.
 */
function createApiProxy(target) {
  return {
    '/api': {
      target,
      changeOrigin: true,
      secure: true,
      rewrite: (path) => path.replace(/^\/api/, ''),
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq, req) => {
          console.log('[vite proxy]', req.method, req.url, '→', target + proxyReq.path);
        });
        proxy.on('error', (err, req) => {
          console.error('[vite proxy] error', req?.url, err.message);
        });
      },
    },
  };
}

// Future PWA: npm i -D vite-plugin-pwa && register in plugins + src/pwa/register.js
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || RENDER_API;

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
    server: {
      port: 5173,
      open: true,
      proxy: createApiProxy(proxyTarget),
    },
    preview: {
      port: 4173,
      proxy: createApiProxy(proxyTarget),
    },
  };
});
