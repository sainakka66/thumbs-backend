# ThumbsUp Verification Framework (Phase 2.5)

Automated proof that implemented features work. **No new business features** — only test harnesses and reports.

## Quick start

```bash
# 1. Database ready
npm run migrate:business
npm run seed:test-users

# 2. Start API (required for api, rbac, audit, e2e, ui)
npm start

# 3. Optional: frontend for UI tests
cd frontend && npm run dev

# 4. Full suite
npm run verify:all
```

Open `verification/index.html` in a browser (after `verify:all` generates `verification/results/dashboard.json`).

## Commands

| Command | Requires API | Output |
|---------|--------------|--------|
| `npm run seed:test-users` | DB only | Console credentials |
| `npm run verify:db` | DB | `DB_HEALTH_REPORT.md` |
| `npm run verify:security` | Optional | `SECURITY_REPORT.md` |
| `npm run verify:api` | Yes | `API_VERIFICATION_REPORT.md` |
| `npm run verify:rbac` | Yes + seed users | `RBAC_TEST_REPORT.md` |
| `npm run verify:audit` | Yes + seed users | `AUDIT_VERIFICATION_REPORT.md` |
| `npm run verify:e2e` | Yes + seed users | `E2E_FLOW_REPORT.md` |
| `npm run verify:ui` | API + UI dev server | `UI_VERIFICATION_REPORT.md`, screenshots |
| `npm run verify:all` | All above | `SYSTEM_HEALTH_REPORT.md` |
| `npm run verify:browser` | Auto-starts API + Vite (local proxy) | `FINAL_SYSTEM_REPORT.md`, headed Playwright, `verification/screenshots/` |

## Phase 2.6 — Full browser execution

```bash
npm run verify:browser
```

This runs migrations, seeds realistic data (`seed:realistic-data`), starts backend + frontend with `VITE_API_PROXY_TARGET=http://127.0.0.1:3000`, executes headed Playwright flows for all four roles, and writes `API_FLOW_REPORT.md`, `RBAC_EXECUTION_REPORT.md`, `AUDIT_PROOF_REPORT.md`, `PERFORMANCE_REPORT.md`, and `FINAL_SYSTEM_REPORT.md`.

## Environment

| Variable | Default |
|----------|---------|
| `VERIFY_API_BASE_URL` | `http://127.0.0.1:3000` |
| `UI_BASE_URL` | `http://127.0.0.1:5173` |
| `TEST_ADMIN_USER` / `TEST_ADMIN_PASS` | `admin_test` / `TestAdmin!2026` |

## Test users (default passwords)

| Role | Username | Password |
|------|----------|----------|
| ADMIN | admin_test | TestAdmin!2026 |
| MANAGER | manager_test | TestManager!2026 |
| SALESPERSON | sales_test | TestSales!2026 |
| DELIVERY_AGENT | delivery_test | TestDelivery!2026 |

## Structure

```
verification/
  api-catalog.js      # Endpoint definitions
  lib/                # HTTP client, reports, config
  results/*.json      # Machine-readable results
  screenshots/        # Playwright captures
  playwright/tests/   # UI specs
  index.html          # Health dashboard
scripts/
  seed-test-users.js
  verify-*.js
docs/
  APPLICATION_INVENTORY.md
```
