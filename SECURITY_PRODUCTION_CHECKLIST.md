# Security Production Checklist — UPI Payments

Use before promoting payment infrastructure to production.

## Secrets & transport

- [ ] `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` set **only on Render** (never Vercel)
- [ ] `JWT_SECRET` ≥ 32 characters
- [ ] `ENFORCE_HTTPS` not disabled in production
- [ ] HSTS enabled (Helmet + `httpsEnforce` middleware)
- [ ] CORS `CORS_ORIGINS` lists production Vercel URL only (+ dev origins if needed)
- [ ] Razorpay webhook URL uses **HTTPS**

## Database

- [ ] `npm run migrate:payments` (002) completed
- [ ] `npm run migrate:security` (003) completed
- [ ] Unique constraints present: `razorpay_payment_id`, `idempotency_key`, `webhook_event_id`, `payload_hash`
- [ ] Admin user has `role = 'admin'`

## Rate limiting & abuse

- [ ] Enterprise limiters active on login, payments, webhooks, risk, admin
- [ ] `LOGIN_RATE_LIMIT_MAX` / `RL_*` env tuned for traffic
- [ ] Suspicious retry logging verified in `suspicious_activities`

## Webhook security

- [ ] Signature verification enabled
- [ ] Replay guard table `webhook_replay_guard` populated on test webhook
- [ ] `WEBHOOK_MAX_AGE_SEC` configured (default 300s)
- [ ] Duplicate webhook returns `replay: true` without double settlement

## Fraud & risk

- [ ] Internal risk engine V2 active
- [ ] Optional: `SOCURE_ENABLED=true` + `SOCURE_API_KEY` (falls back if unavailable)
- [ ] Optional: `SARDINE_ENABLED=true` + `SARDINE_API_KEY` (falls back if unavailable)
- [ ] HIGH risk → payment held (`FLAGGED_FOR_REVIEW`)
- [ ] CRITICAL risk → payment blocked

## Admin

- [ ] Admin routes require `role=admin`
- [ ] Optional `ADMIN_IP_ALLOWLIST` configured
- [ ] Refunds require approval workflow (`/admin/payments/refund/request` then refund with `approvalId`)
- [ ] `admin_audit_logs` receiving entries

## PWA / frontend

- [ ] No Razorpay secrets in frontend build
- [ ] Service worker does not cache `/payments/*` responses with sensitive data
- [ ] JWT remains in `localStorage` (bearer-only); Origin guard on mutating API calls

## Observability

- [ ] `LOG_LEVEL=info` on Render
- [ ] `security_incidents` table monitored
- [ ] Run `npm run test:security` in CI

## Automated tests

```bash
npm run test:security
```
