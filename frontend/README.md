# Frontend-only Vercel deployment (optional)

If the root project still deploys as Node/Express, set the Vercel project **Root Directory** to `frontend`:

1. Vercel Dashboard → Project → Settings → General → Root Directory → `frontend`
2. Copy or sync `index.html` from repo root into this folder before deploy
3. Redeploy

This folder contains only static hosting config — no `server.js`, no `package.json`.
