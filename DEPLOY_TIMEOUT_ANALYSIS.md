# Render Deploy Timeout Analysis

**Project:** ThumbsUpApp (backend web service: `server.js` on Render)  
**Analysis date:** 2026-05-29  
**Scope:** Investigate only — no code changes applied.

---

## Executive summary

The repository’s **intended** Render backend deploy path is lightweight: `npm install` → `node server.js` (via `npm start`). That should complete in **under ~5 minutes** unless the Render Dashboard uses a **different** build/start command, a **wrong health check path**, or **blocking database connectivity** during health probes.

The **highest-probability timeout causes** in this codebase are:

1. **Misconfigured Render Build/Start Command** that runs `testing-lab` verification (`verify:all`, `verify:browser`, `verify:ui`) or Playwright browser installs during deploy.
2. **Health check probing `/` instead of `/health`**, causing repeated failed readiness checks until Render’s deploy window expires (while the process may actually be running).
3. **`/health` depending on MySQL** — if the DB is unreachable from Render, each health probe can wait on connection/query timeouts before returning 500, so Render never marks the service healthy.
4. **Build installing devDependencies** (`@playwright/test` → `playwright` packages) plus any step that runs `npx playwright install`, adding **several minutes** of browser downloads.

There are **no `postinstall` / `prestart` / `prepare` hooks** in root `package.json`. **`npm start` does not chain migrations, seeds, or tests.**

---

## Documented Render settings (from repo)

| Setting | Documented value | Source |
|---------|------------------|--------|
| Build Command | `npm install` | `DEPLOYMENT_GUIDE.md` §4.1 |
| Start Command | `node server.js` (equivalent to `npm start`) | `DEPLOYMENT_GUIDE.md` §4.1 |
| Start script in `package.json` | `node server.js` | `package.json` |
| Health endpoint (app) | `GET /health` | `server.js`, `docs/APPLICATION_INVENTORY.md` |

**Action:** Compare these to the **actual** values in the Render Dashboard (Build Command, Start Command, Health Check Path). Repo docs may not match live settings.

---

## 1. `package.json` scripts

| Script | Command | Est. time | Runs on deploy? | Should run on deploy? |
|--------|---------|-----------|-----------------|------------------------|
| `start` | `node server.js` | **2–10 s** (if env valid) | **Yes** (if Start = `npm start`) | **Yes** |
| `migrate:payments` | `node scripts/run-payments-migration.js` | **30 s – 3 min** (DB + 002 SQL) | Only if wired in Build/Start | **No** — run manually / CI / one-off job |
| `migrate:security` | `node scripts/run-security-migration.js` | **20 s – 2 min** | Only if wired in Build/Start | **No** |
| `migrate:business` | `node scripts/run-business-migration.js` | **20 s – 2 min** (may fail on collation UPDATE) | Only if wired in Build/Start | **No** |
| `seed:test-users` | `node testing-lab/seed-data/seed-test-users.js` | **5–30 s** | Only if wired in Build/Start | **No** — local/QA only |
| `seed:realistic-data` | `node testing-lab/seed-data/seed-realistic-data.js` | **10 s – 2 min** (bulk inserts) | Only if wired in Build/Start | **No** |
| `verify:all` | `node testing-lab/scripts/verify-all.js` | **3–15+ min** | Only if wired in Build/Start | **No** |
| `verify:browser` | `node testing-lab/scripts/run-browser-execution.js` | **5–20+ min** | Only if wired in Build/Start | **No** |
| `verify:ui` | `node testing-lab/scripts/verify-ui.js` | **3–10+ min** | Only if wired in Build/Start | **No** |
| `verify:db` … `verify:e2e` | Various `testing-lab/scripts/*` | **30 s – 5 min** each | Only if wired in Build/Start | **No** |
| `test:security` | `node --test testing-lab/verification/payment-security.test.mjs` | **&lt; 30 s** | Only if wired in Build/Start | **No** (CI only) |
| `security-check` | `node security-check.mjs` | **&lt; 30 s** | Only if wired in Build/Start | **No** |
| `setup:env` / `verify:env` | `scripts/setup-env.js`, `scripts/verify-backend-env.js` | **&lt; 10 s** | Only if wired in Build/Start | **No** |

**Exact file:** `package.json` (lines 26–48)

**Finding:** None of the verification or seed scripts are invoked by `start`. Timeout risk appears only if Render Build/Start fields were customized to run them.

---

## 2. Build Command

### Intended: `npm install`

| Aspect | Detail |
|--------|--------|
| **Exact command** | `npm install` (per `DEPLOYMENT_GUIDE.md`) |
| **Est. time** | **1–4 min** (prod deps only, ~15 runtime packages + `bcrypt` native build) |
| **Should run on deploy?** | **Yes** |

### Risk: devDependencies installed during build

| Package | Location | Est. extra time if installed |
|---------|----------|------------------------------|
| `@playwright/test` | `package.json` `devDependencies` | Pulls `playwright@1.60.0` (present in local `package-lock.json`) |

On Render, `NODE_ENV=production` during build usually runs `npm install --omit=dev`, so Playwright is **often skipped**. If the Dashboard uses `npm install --include=dev`, `NPM_CONFIG_PRODUCTION=false`, or `npm ci` without omitting dev, Playwright packages are installed (**+1–2 min** download/extract, no browser until `npx playwright install`).

**Exact file:** `package.json` line 50–52; `package-lock.json` (`@playwright/test`, `playwright`)

### Risk: compound build commands (not in repo docs but common misconfiguration)

| Example Build Command | Est. time | Should run on deploy? |
|----------------------|-----------|------------------------|
| `npm install && npm run migrate:payments && npm run migrate:security && npm run migrate:business` | **2–8 min** | **No** (OK as separate release job; risky on every deploy if DB slow) |
| `npm install && npm run verify:all` | **5–20+ min** | **No** — **likely deploy timeout** |
| `npm install && npm run verify:browser` | **8–25+ min** | **No** — **very likely deploy timeout** |

---

## 3. Start Command

### Intended: `node server.js` / `npm start`

| Aspect | Detail |
|--------|--------|
| **Exact command** | `npm start` → `node server.js` |
| **Exact file** | `package.json` line 27; listener `server.js` lines 909–915 |
| **Est. time to bind port** | **&lt; 5 s** after process start (sync module load + `httpServer.listen`) |
| **Binds correctly for Render?** | **Yes** — `listen(PORT, '0.0.0.0')` uses `process.env.PORT` |
| **Should run on deploy?** | **Yes** |

### Startup blocking (before `listen`)

| Step | File | Behavior | Est. time | Timeout risk |
|------|------|----------|-----------|--------------|
| Load modules | `server.js` | Sync `require()` of express, payments, business, bcrypt, etc. | **1–3 s** | Low |
| JWT config | `config.js` `getJwtSecret()` | **Exits process** if `JWT_SECRET` missing/short in production | **Instant fail** | Fails deploy (crash loop), not long hang |
| DB config | `config.js` `getDbConfig()` | **Throws** if DB env missing in production | **Instant fail** | Crash loop |
| MySQL pool | `server.js` line 85 | `createPool()` — does **not** block listen | — | Low at startup |
| Socket.IO | `payments/socket.js` | Wrapped in try/catch; warns and continues | **&lt; 1 s** | Low |

**No migrations, seeds, Playwright, or `verify:*` run inside `server.js` startup.**

### Risk: custom Start Command

| Example | Est. time | Should run on deploy? |
|---------|-----------|------------------------|
| `npm run migrate:business && npm start` | **1–5 min** + start | **No** for routine deploys |
| `npm run verify:all && npm start` | **5–20+ min** | **No** — **timeout** |
| `npm run verify:browser` | **8–25+ min** (never reaches `start`) | **No** — **timeout** |

---

## 4. `postinstall` / lifecycle hooks

| Hook | Present in root `package.json`? | Notes |
|------|----------------------------------|-------|
| `postinstall` | **No** | Safe |
| `preinstall` | **No** | Safe |
| `prepare` | **No** | Safe |
| `prestart` / `poststart` | **No** | Safe |

**Frontend** (`frontend/package.json`) has `prebuild` / `postbuild` — **not executed** unless Render build runs in `frontend/` (backend service should use repo root, not `frontend/`).

**Implicit risk:** `npx playwright install` is **not** a lifecycle hook; it is invoked explicitly by `testing-lab/scripts/verify-ui.js` (line 23).

---

## 5. Migration scripts

| Script | Exact path | Command | Est. time | On deploy by default? | Should run on deploy? |
|--------|------------|---------|-----------|------------------------|------------------------|
| Payments 002 | `scripts/run-payments-migration.js` | `npm run migrate:payments` | **30 s – 3 min** | **No** | **No** — manual/CI/one-off |
| Security 003 | `scripts/run-security-migration.js` | `npm run migrate:security` | **20 s – 2 min** | **No** | **No** |
| Business 004 | `scripts/run-business-migration.js` | `npm run migrate:business` | **20 s – 2 min** | **No** | **No** |

**Runner:** `scripts/lib/mysql-migrate.js` — runs SQL from `migrations/*.sql` with INFORMATION_SCHEMA checks (no infinite loop; exits on error).

**Known issue:** `004-enterprise-business.sql` final `UPDATE users … JOIN roles` can fail with **collation mismatch** (`utf8mb4_0900_ai_ci` vs `utf8mb4_unicode_ci`). That causes **fast failure** (`process.exit(1)`), not a hang — unless a wrapper script ignores exit codes.

**Also invoked from:** `testing-lab/scripts/run-browser-execution.js` (lines 98–105) when running `verify:browser` — **not** from `npm start`.

---

## 6. Verification scripts (`testing-lab/`)

| Script | Path | Est. time | Infinite loop? | On deploy by default? |
|--------|------|-----------|----------------|----------------------|
| `verify-all.js` | `testing-lab/scripts/verify-all.js` | **3–15+ min** (7 suites sequential) | No | **No** |
| `verify-browser` / `run-browser-execution.js` | `testing-lab/scripts/run-browser-execution.js` | **5–20+ min** | **Bounded wait loop** (see §9) | **No** |
| `verify-ui.js` | `testing-lab/scripts/verify-ui.js` | **3–10+ min** | No | **No** |
| `verify-api.js` | `testing-lab/scripts/verify-api.js` | **1–3 min** | No | **No** |
| `verify-db.js` | `testing-lab/scripts/verify-db.js` | **10–60 s** | No | **No** |
| `verify-rbac.js` | `testing-lab/scripts/verify-rbac.js` | **1–3 min** | No | **No** |
| `verify-audit.js` | `testing-lab/scripts/verify-audit.js` | **1–3 min** | No | **No** |
| `verify-e2e.js` | `testing-lab/scripts/verify-e2e.js` | **1–5 min** | No | **No** |
| `verify-security.js` | `testing-lab/scripts/verify-security.js` | **&lt; 1 min** | No | **No** |
| `e2e-qa.mjs` | `testing-lab/scripts/e2e-qa.mjs` | **5–15 min** | No (not in `npm` deploy scripts) | **No** |

**If `verify:all` is the Build or Start command:** `verify-ui` runs `npx playwright install chromium` then Playwright tests against `http://localhost:5173` — **will fail or hang without Vite**, and browser install alone can exceed Render’s patience when combined with other suites.

---

## 7. Seed scripts

| Script | Path | Command | Est. time | On deploy by default? | Should run on deploy? |
|--------|------|---------|-----------|------------------------|------------------------|
| Test users | `testing-lab/seed-data/seed-test-users.js` | `npm run seed:test-users` | **5–30 s** | **No** | **No** |
| Realistic bulk data | `testing-lab/seed-data/seed-realistic-data.js` | `npm run seed:realistic-data` | **10 s – 2 min** | **No** | **No** |

Also called from `run-browser-execution.js` during `verify:browser` only.

---

## 8. Playwright execution

| Item | Exact location | Est. time | On deploy by default? |
|------|----------------|-----------|------------------------|
| Dependency | `package.json` `devDependencies["@playwright/test"]` | Install only if dev deps included: **~1–2 min** | Only if dev deps installed |
| Browser download | `testing-lab/scripts/verify-ui.js` line 23: `npx playwright install chromium` | **2–8 min** (network-dependent) | Only if `verify:ui` / `verify:all` run |
| Full headed suite | `testing-lab/playwright/tests/full-execution.spec.js` via `verify:browser` | **~2–5 min** (+ server boot 2+ min) | Only if `verify:browser` runs |
| Smoke suite | `testing-lab/playwright/tests/app.spec.js` via `verify:ui` | **~1–3 min** (8 tests) | Only if `verify:ui` / `verify:all` runs |
| Config timeout | `testing-lab/playwright/playwright.config.js` `timeout: 120000` | Per-test max **120 s** | N/A on production start |

Playwright **requires a display/browser** and **local frontend on :5173** for UI tests — inappropriate for Render backend deploy.

---

## 9. Infinite loops and long waits

| Location | Construct | Max duration | Triggered on deploy? |
|----------|-----------|--------------|----------------------|
| `testing-lab/scripts/run-browser-execution.js` | `waitForServers()` — `while (Date.now() < deadline)` polling API/UI | **120 s** (`timeoutMs = 120000`) | Only `verify:browser` |
| `testing-lab/scripts/run-browser-execution.js` | Spawns Vite + waits for `localhost:5173` | Up to **120 s** | Only `verify:browser` |
| `testing-lab/verification/lib/http.js` | `setTimeout` abort per request | **15 s** default | Only verify scripts |
| `lib/db/safeQuery.js` | `withTimeout` on queries | **15 s** default (`DB_QUERY_TIMEOUT_MS`) | Runtime API, not build |
| `server.js` | No `while(true)`, no `setInterval` at startup | — | — |

**No infinite loops** in `server.js` or production startup path.

---

## 10. Long-running startup tasks

### A. Render health check vs app routes

| Probe | Result | Impact |
|-------|--------|--------|
| `GET /` | **404** JSON (`server.js` lines 895–897) | If Render health check defaults to `/`, service may never pass readiness |
| `GET /health` | **200** when DB reachable (`SELECT 1` + optional `users` count) | **Correct** health path |

**Exact file:** `server.js` lines 148–163 (`/health`), 895–897 (404 handler)

**Est. time per failed probe:** If MySQL is down, `await db.query('SELECT 1')` may take **~10 s** (mysql2 default `connectTimeout`) or longer on TCP hang — multiplied by Render retry interval → **deploy “timeout”** symptom.

### B. Environment misconfiguration (fast crash vs timeout)

| Variable | File | If missing/wrong |
|----------|------|------------------|
| `JWT_SECRET` (prod, ≥32 chars) | `config.js` `getJwtSecret()` | Process **exits before listen** |
| `DATABASE_URL` / `MYSQL*` | `config.js` `getDbConfig()` | **Throws** in production — exit before listen |
| `PORT` | `server.js` line 909 | Render sets automatically — OK |

Repeated crash-restart can look like a prolonged deploy failure.

### C. `bcrypt` native compile during `npm install`

| Package | Est. build time on Render Linux |
|---------|----------------------------------|
| `bcrypt` | **30 s – 2 min** (node-gyp) |

Unlikely alone to cause timeout; significant only combined with Playwright/verify steps.

### D. Wrong service root (monorepo mistake)

If Render **Root Directory** is wrong (e.g. empty, or `frontend/`), build may run `vite build` + `sharp` icon generation (`frontend/package.json` `prebuild`/`postbuild`) — **2–8 min** — or fail. Backend should use **repository root** with `server.js`.

---

## Root cause matrix (ranked)

| Rank | Cause | Evidence | Est. deploy delay | Fix recommendation (config only) |
|------|-------|----------|-------------------|-----------------------------------|
| **1** | Build/Start runs `verify:all` or `verify:browser` | Scripts exist; `verify:browser` waits **120s** + migrations + Playwright **~2.4m+** | **8–25+ min** | Set Build: `npm install`; Start: `npm start`. Never run `verify:*` on Render. |
| **2** | Build/Start runs `verify:ui` / Playwright install | `verify-ui.js` line 23 `npx playwright install chromium` | **3–10+ min** | Remove from Render commands; run in CI/local only. |
| **3** | Health check path `/` instead of `/health` | No route on `/`; returns 404 | Until Render gives up (**5–15 min** typical) | Set Health Check Path to **`/health`** in Render Dashboard. |
| **4** | Health check on `/health` but DB unreachable from Render | `/health` runs `SELECT 1` | **10s+ per probe** × retries | Fix Railway/MySQL firewall, `DATABASE_URL`, SSL; allow Render egress to DB. |
| **5** | Build installs devDependencies + heavy QA toolchain | `@playwright/test` in lockfile | **+1–3 min** | Use `npm install --omit=dev` or ensure `NODE_ENV=production` for build. |
| **6** | Build runs all migrations every deploy | `migrate:*` × 3 | **2–8 min** | Run migrations manually or in a separate job, not every web deploy. |
| **7** | Intended path only (`npm install` + `npm start`) | Matches `DEPLOYMENT_GUIDE.md` | **2–5 min** total | **Recommended baseline** — verify Dashboard matches docs. |

---

## What is **not** causing timeout (under default config)

- `npm start` → **only** `node server.js`
- No `postinstall` / `prestart` hooks in root `package.json`
- Server binds `0.0.0.0:$PORT` promptly after startup
- Migrations/seeds are **not** auto-run from `server.js`
- `testing-lab/` is isolated — **not imported** by production server code

---

## Recommended Render Dashboard settings (backend)

| Field | Recommended value |
|-------|-------------------|
| **Root Directory** | *(repo root, where `server.js` lives)* |
| **Build Command** | `npm install` or `npm ci --omit=dev` |
| **Start Command** | `npm start` or `node server.js` |
| **Health Check Path** | `/health` |
| **Env** | `JWT_SECRET`, `DATABASE_URL` or `MYSQLHOST`/`MYSQLUSER`/`MYSQLPASSWORD`/`MYSQLDATABASE`, Razorpay vars as needed |

**Do not set:** `npm run verify:all`, `npm run verify:browser`, `npm run seed:*`, or migration chains in Build/Start.

---

## How to confirm in Render logs

1. **Build log** — Look for `playwright`, `verify:`, `migrate:`, `vite`, or `seed:` — any of these indicate a non-production build command.
2. **Deploy log** — Look for `Server running on port` — if it appears but deploy still times out, suspect **health check path** or **DB failing `/health`**.
3. **Deploy log** — If `FATAL JWT_SECRET` or `Database not configured` repeats, fix env vars (fast crash, not long build).
4. **Timing** — Build &gt; 10 min → almost certainly extra commands or dev deps + Playwright; deploy hangs after “Server running” → health check/DB.

---

## Files referenced

| File | Role in timeout analysis |
|------|---------------------------|
| `package.json` | Scripts, dependencies, no lifecycle hooks |
| `server.js` | Start command target; `/health`; listen on `PORT` |
| `config.js` | Production DB/JWT requirements (fail-fast) |
| `DEPLOYMENT_GUIDE.md` | Documented `npm install` / `node server.js` |
| `scripts/run-*-migration.js` | Optional long build steps |
| `testing-lab/scripts/verify-all.js` | Multi-suite orchestrator |
| `testing-lab/scripts/run-browser-execution.js` | 120s wait + migrations + Playwright |
| `testing-lab/scripts/verify-ui.js` | `playwright install` + UI tests |
| `frontend/package.json` | Irrelevant unless wrong Render root |

---

*End of analysis — no repository code was modified.*
