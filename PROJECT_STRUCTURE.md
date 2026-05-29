# ThumbsUp Project Structure

```
ThumbsUpApp/
├── frontend/                 # Production React + Vite PWA
├── business/                 # Executive dashboard, reports, PDFs, notifications
├── payments/                 # UPI payment module (routes, fraud, webhooks)
├── lib/                      # Shared server libs (RBAC, audit, security, db)
├── migrations/               # Database SQL migrations
├── scripts/                  # Production ops (migrations, env setup, hash password)
├── docs/                     # Architecture and application documentation
├── config.js                 # App configuration (env, DB, JWT, CORS)
├── config/                   # Payment/security config modules
├── security-check.mjs        # Production security checklist runner
├── server.js                 # Main API entry
├── index.html                # Legacy static shell (if used)
├── PROJECT_STRUCTURE.md
└── package.json
```

## Production code

| Area | Location |
|------|----------|
| Frontend app | `frontend/src/` |
| API server | `server.js`, `business/`, `payments/` |
| RBAC & audit | `lib/rbac/`, `lib/audit/` |
| Database schema | `migrations/` |

## Deployment code

| Area | Location |
|------|----------|
| Vercel frontend | `frontend/` |
| Render backend | `server.js`, env via Render dashboard |
| Firebase hosting | `firebase.json` |
| Guides | `DEPLOYMENT_GUIDE.md`, `PAYMENTS_DEPLOYMENT.md` |

## Database code

| Area | Location |
|------|----------|
| Migrations | `migrations/*.sql` |
| Migration runners | `scripts/run-*-migration.js` |
| Schema docs | `DATABASE_SCHEMA.md` |
