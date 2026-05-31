# Deployment Report — Production Roadmap

**Branch:** `main` · **Date:** 2026-05-31

## Workflow

| Step | Command / action |
|------|------------------|
| Migrations | `npm run migrate:roadmap-security`, `migrate:roadmap-collections`, `migrate:roadmap-suppliers` |
| Frontend build | `cd frontend && npm run build` |
| Git push | `git push origin main` |
| Vercel production | `cd frontend && vercel deploy --prod --yes` |
| Render backend | Auto-deploy on `main` push |

## Platforms

- **Frontend:** Vercel — https://thumbs-up-app-two.vercel.app
- **Backend:** Render — https://thumbs-backend.onrender.com
