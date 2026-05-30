# Performance Audit — Thumbs Up Distribution System

**Date:** 2026-05-30  
**Frontend:** https://thumbs-up-app-two.vercel.app (React 19 + Vite 7)  
**Backend:** https://thumbs-backend.onrender.com (Express 5, MySQL on Railway)  
**Client region:** India · **Server region:** Render `iad1` (US East) — high RTT baseline (~330 ms/req)

---

## Phase 1 — Measured baseline

### API durations (live, warm server)

| Endpoint | Duration | Notes |
|----------|----------|-------|
| `GET /health` (warm) | ~750 ms | RTT + `SELECT 1` + user count |
| `POST /login` | **~1,994 ms** | bcrypt(12) + permission load + RTT |
| `GET /dashboard/executive` | **~983 ms** | 8 parallel + 2 sequential queries |
| `GET /dashboard/admin` | ~326 ms | 5 parallel queries |
| `GET /notifications` | ~346 ms | list + unread count (2 queries) |
| `GET /stock-alerts` | ~366 ms | |
| `GET /products` | ~342 ms | |
| `GET /customers` | ~339 ms | `SELECT *` |
| `GET /audit/logs?limit=50` | ~356 ms | count + `SELECT *` |

**Baseline RTT floor:** ~330 ms per request (simple GETs all land near this), so **every extra round trip costs ~330 ms**.

### Dashboard load (frontend waterfall — before)

`DashboardPage` issued **sequential** awaits:

1. `fetchExecutiveDashboard()` → `/dashboard/executive` (~983 ms)
2. `fetchAdminDashboard()` → `/dashboard/admin` (~326 ms) *(admins only)*
3. `syncStockAlerts()` → `POST /stock-alerts/sync`

**Total dashboard API time (admin): ~1.3–1.6 s** of serialized round trips after login.

### Login flow (frontend — before)

- `POST /login` (~2 s) → then `AuthContext` boot may call `GET /rbac/me` if permissions empty → extra ~330 ms.
- bcrypt rounds = **12** (env `BCRYPT_ROUNDS`).

### Bundle size (production build — before)

| Asset | Raw | Gzip |
|-------|-----|------|
| `index-*.js` (single chunk) | **360.2 kB** | **110.8 kB** |
| `index-*.css` | 22.8 kB | 5.3 kB |
| workbox-window | 5.8 kB | 2.4 kB |

- **No route-based code splitting** — every page (admin, payments, reports) ships in the initial chunk.
- All 20+ pages imported eagerly in `App.jsx`.

### Initial page load

- Single JS chunk parsed before first paint of any route.
- No skeletons: pages render blank (`null`/empty) until data resolves → perceived blank screen for ~1–2 s on mobile.

### Mobile Lighthouse (production `/login`, Lighthouse 13.3.0)

| Category | Score |
|----------|-------|
| Performance | 88 |
| Accessibility | 100 |
| Best Practices | 100 |
| SEO | 91 |

(PWA category no longer exists in Lighthouse ≥ v12.)

### Database

- Indexes already present on hot tables: `sales(created_at, customer_id)`, `audit_logs(created_at, action, user_id, entity)`, `notifications(user_id,is_read / created_at / type)`, `stock_alerts(status / inventory / date)`, `inventory(sku, Name)`, `users(role,status / email / phone)`.
- `SELECT *` used in: `/customers`, `/products`, `/audit/logs`, `notifications.listForUser`, `stock_alerts.listActiveAlerts`, product update.
- No index on `sales.product_name` (used by top-products `GROUP BY`).
- `users.username` index not guaranteed (legacy table) — critical for login lookup.

---

## Identified bottlenecks

| # | Issue | Root cause | Fix (phase) |
|---|-------|-----------|-------------|
| 1 | Dashboard slow | 2–3 sequential API round trips | Aggregate into `GET /dashboard/summary` (P2) |
| 2 | Large initial bundle | No code splitting | Lazy routes (P4) |
| 3 | Blank screens | No loading UI | Skeletons (P5) |
| 4 | Repeated refetch on nav | No client cache | TanStack Query SWR (P4) |
| 5 | `SELECT *` over-fetch | Implicit columns | Explicit columns (P3) |
| 6 | Missing `sales.product_name` / `users.username` index | — | Migration 007 (P3) |
| 7 | Login ~2 s | bcrypt(12) + extra `rbac/me` | Tune + avoid redundant call (P4/P7) |

See `PERFORMANCE_REPORT.md` for after-metrics.
