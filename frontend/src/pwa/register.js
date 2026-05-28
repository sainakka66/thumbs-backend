/**
 * PWA service worker registration (stub).
 *
 * To enable offline support:
 * 1. npm i -D vite-plugin-pwa
 * 2. Add VitePWA plugin in vite.config.js
 * 3. Uncomment registerServiceWorker() in main.jsx
 */
export function registerServiceWorker() {
  if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err);
      });
    });
  }
}
