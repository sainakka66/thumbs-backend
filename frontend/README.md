# Thumbs Up — React Frontend

Modern **React 19 + Vite 7 + Tailwind CSS + React Router** SPA for the Thumbs Up distribution system. Talks to the existing **Render** API (`server.js`) — no backend changes required.

## Quick start

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:5173 and sign in with your Railway/Render user.

## Environment

| Variable | When | Description |
|----------|------|-------------|
| `VITE_API_BASE_URL` | **Vercel (required)** | `https://thumbs-backend.onrender.com` — browser calls Render directly |
| *(unset)* | **Local dev (recommended)** | Vite proxies `/login`, `/products`, … to Render — no CORS issues |
| `VITE_USE_DIRECT_API` | Local optional | `true` + `VITE_API_BASE_URL` — skip proxy; needs Render `CORS_ORIGINS` |

### "Failed to fetch" on localhost

**Root cause:** Browser blocks cross-origin requests from `http://localhost:5173` to Render when `CORS_ORIGINS` on Render lists only the Vercel URL.

**Fix (local):** Remove `VITE_API_BASE_URL` from `frontend/.env` and restart `npm run dev` (uses Vite proxy).

**Fix (Render):** Redeploy backend after updating `config.js` so `localhost:5173` is allowed.

## Architecture

```
src/
  config/          # env constants
  services/        # API layer (auth, products, sales, …)
  context/         # Auth + toast
  components/
    ui/            # Reusable UI primitives
    layout/        # Sidebar, shell
  pages/           # Route screens
  pwa/             # Service worker stub for future PWA
```

## Deploy (Vercel)

Root `vercel.json` builds this folder and publishes `frontend/dist`.

Set `VITE_API_BASE_URL` in the Vercel project if the API URL changes.

Ensure Render `CORS_ORIGINS` includes your Vercel domain.

## PWA (Progressive Web App)

Production PWA via `vite-plugin-pwa` (`generateSW` + Workbox).

- **Install:** Android Chrome “Install app” prompt (`InstallPrompt` component)
- **Offline:** Static assets precached; GET API uses `NetworkFirst` (5 min, no POST/login cache)
- **Updates:** `registerType: 'autoUpdate'` with reload banner
- **Icons:** `public/pwa-192x192.png`, `pwa-512x512.png`, maskable variant (generated on `npm run build`)

```bash
npm run build   # runs prebuild icon generation + SW
npm run preview # test PWA locally on :4173
```

**Vercel:** `vercel.json` sets headers for `sw.js`, `workbox-*.js`, and `manifest.webmanifest`. Static files in `dist/` are served before SPA rewrites.

**Lighthouse:** Test with `npm run build && npm run preview`, open Chrome DevTools → Lighthouse → PWA.

## Legacy SPA

The original single-file app is kept at `index.legacy.html` in this folder and `index.html` at repo root for reference.
