# Production Hotfix Report — Roadmap Migrations (Railway)

**Date:** 2026-05-31  
**Final status:** **SUCCESSFULLY DEPLOYED**

---

## Phase 1 — Production database discovery

| Item | Value |
|------|--------|
| **Backend host** | Render — `https://thumbs-backend.onrender.com` |
| **Database provider** | Railway MySQL |
| **Database name** | `railway` |
| **MySQL version** | 9.4.0 |
| **Connection host (public proxy)** | `tramway.proxy.rlwy.net` |
| **Port** | `15545` |
| **User** | `root` (Railway default) |
| **SSL** | Enabled (`config.js` auto-SSL for `*.rlwy.net`) |

### How production DB is selected

| Runtime | Config source | Resolution order |
|---------|---------------|------------------|
| **Render backend** | Render env vars | `DATABASE_URL` or `MYSQL_URL` first; else `MYSQLHOST` / `MYSQLUSER` / `MYSQLPASSWORD` / `MYSQLDATABASE` / `MYSQLPORT` via `getDbConfig()` in `config.js` |
| **Local `.env`** | `DB_HOST=localhost`, `DB_NAME=thumbs_up` | Used only when Railway vars are **not** set — explains why local `npm run migrate:roadmap-*` did not fix production |
| **This hotfix** | `MYSQLHOST` + `MYSQL*` (same pattern as Render) | Targets Railway production explicitly |

**Health check (post-migration):** `GET /health` → `200`, `database: connected`, `users: 6`.

---

## Phase 2 — Schema comparison (pre-migration)

**Symptom:** `POST /login` intermittently **HTTP 500**, `code: ER_NO_SUCH_TABLE` (new device path inserting into `user_mfa_email_otp` / `login_attempts`).

### Missing tables (15)

- `user_mfa_settings`, `user_mfa_backup_codes`, `user_mfa_email_otp`
- `login_attempts`, `account_lockouts`, `security_audit_events`
- `collections`, `payment_reconciliations`, `feature_flags`
- `suppliers`, `purchase_orders`, `stock_inward`, `supplier_ledger`, `warehouse_transfers`, `supplier_payments`

### Missing columns

| Table | Columns |
|-------|---------|
| `users` | `mfa_enabled`, `mfa_enforced` |
| `trusted_devices` | `device_label`, `browser_name`, `ip_address`, `is_verified`, `verified_at`, `last_login_at` (`os_name` already present) |
| `user_sessions` | `browser_name`, `os_name`, `device_label`, `is_trusted`, `revoked_at`, `revoke_reason` |

### Missing indexes (blocked until tables created)

- `login_attempts`: `idx_login_attempts_user`, `idx_login_attempts_ip`
- `user_mfa_email_otp`: `idx_mfa_email_user_exp`
- `collections`: `idx_collections_customer`
- `suppliers`: `uk_suppliers_code`

### Exact migrations required

| Order | NPM script | SQL file |
|-------|------------|----------|
| 1 | `npm run migrate:roadmap-security` | `migrations/008-roadmap-security.sql` |
| 2 | `npm run migrate:roadmap-collections` | `migrations/009-roadmap-collections.sql` |
| 3 | `npm run migrate:roadmap-suppliers` | `migrations/010-roadmap-suppliers.sql` |

**Runners:** `scripts/run-roadmap-security-migration.js`, `run-roadmap-collections-migration.js`, `run-roadmap-suppliers-migration.js` → `scripts/lib/mysql-migrate.js` (idempotent `CREATE TABLE IF NOT EXISTS`, safe column/index adds).

---

## Phase 3 — Migration execution plan

1. Confirm target is Railway `railway` (not local `thumbs_up`).
2. Set `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` (or `MYSQL_URL`) — **never commit values**.
3. Run migrations **in order** 008 → 009 → 010 (additive only).
4. Re-run `node scripts/production-schema-audit.js` (exit 0 = schema OK).
5. Verify `users` row count unchanged.
6. `POST /login` on Render with new `x-device-fingerprint` (exercises OTP + `login_attempts` inserts).
7. Confirm no migration runner errors.

**Safety:** No `DROP`, `TRUNCATE`, or data deletes. Only `CREATE TABLE IF NOT EXISTS`, `ADD COLUMN` (skip if exists), `INSERT IGNORE` for permissions/flags.

---

## Phase 4 — Migration execution

Executed against Railway production (`schema: railway`):

| Migration | Result | Statements |
|-----------|--------|------------|
| `migrate:roadmap-security` | **SUCCESS** | 13/13 applied |
| `migrate:roadmap-collections` | **SUCCESS** | 7/7 applied |
| `migrate:roadmap-suppliers` | **SUCCESS** | 9/9 applied |

**Failures:** None.

---

## Phase 5 — Verification

| Check | Result |
|-------|--------|
| Schema audit (`production-schema-audit.js`) | **SCHEMA_OK** — no missing tables/columns/indexes |
| `users` row count | **6** (unchanged) |
| `login_attempts` | **1** row after test login (expected) |
| `user_mfa_email_otp` | **1** row after new-device challenge (expected) |
| `POST /login` (new device fingerprint) | **200**, `challengeRequired: true` (not 500) |
| `GET /health` | **200**, DB connected |

**Data loss:** None observed (user count stable; only new security/collections/supplier schema + permission seeds via `INSERT IGNORE`).

---

## Operational notes

1. **Rotate Railway MySQL password** if it was ever committed to git or shared in logs; update Render `MYSQL*` / `DATABASE_URL` together.
2. **Future migrations:** export Railway vars locally or run from a CI job with secrets — do not rely on localhost `.env` alone.
3. **Helper scripts added (not required for runtime):**
   - `scripts/production-schema-audit.js`
   - `scripts/verify-production-login.js` (requires `TEST_PASSWORD` env)

---

## Final status

**SUCCESSFULLY DEPLOYED** — Railway production schema now matches roadmap migrations 008–010; production login no longer returns `ER_NO_SUCH_TABLE` on the new-device path.
