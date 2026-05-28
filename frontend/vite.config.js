import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const RENDER_API = 'https://thumbs-backend.onrender.com';

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

const API_ORIGIN = new URL(RENDER_API).origin;

/** Safe GET-only API caching — never caches POST /login or mutations */
const apiRuntimeCaching = {
  urlPattern: ({ request, url }) => {
    if (request.method !== 'GET') return false;
    const href = url.href;
    if (href.includes('/login') || href.includes('/logout')) return false;
    return (
      href.startsWith(API_ORIGIN) ||
      (url.pathname.startsWith('/api/') && url.origin === 'http://localhost:5173') ||
      (url.pathname.startsWith('/api/') && url.origin === 'http://127.0.0.1:5173')
    );
  },
  handler: 'NetworkFirst',
  options: {
    cacheName: 'thumbs-api-read-cache',
    networkTimeoutSeconds: 10,
    expiration: {
      maxEntries: 48,
      maxAgeSeconds: 5 * 60,
    },
    cacheableResponse: {
      statuses: [200],
    },
  },
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || RENDER_API;

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        strategies: 'generateSW',
        injectRegister: false,
        manifestFilename: 'manifest.webmanifest',
        filename: 'sw.js',
        includeAssets: [
          'favicon.svg',
          'pwa-192x192.png',
          'pwa-512x512.png',
          'pwa-512x512-maskable.png',
          'apple-touch-icon.png',
        ],
        manifest: {
          name: 'Thumbs Up Distribution',
          short_name: 'Thumbs Up',
          description: 'Distribution management for Thumbs Up beverages',
          theme_color: '#D42B2B',
          background_color: '#0F0F0F',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          id: '/',
          prefer_related_applications: false,
          categories: ['business', 'productivity'],
          icons: [
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/pwa-512x512-maskable.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: '/pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webmanifest}'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            apiRuntimeCaching,
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: mode === 'development',
          type: 'module',
          navigateFallback: 'index.html',
        },
      }),
    ],
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
