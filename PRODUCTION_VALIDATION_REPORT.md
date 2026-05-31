# Production Validation Report — Roadmap Release

**Date:** 2026-05-31

## Health

- `GET https://thumbs-backend.onrender.com/health` — expect `ok: true`

## New API surfaces

| Path | Purpose |
|------|---------|
| `POST /login` | Optional `challengeRequired` |
| `POST /login/mfa/verify` | MFA/device challenge completion |
| `/security/*` | MFA, sessions, devices |
| `/collections/*` | Dues dashboard, collections, UPI QR |
| `/suppliers/*` | Supplier ops |
| `/risk/dashboard` | Risk matrix (admin) |

## UI routes

- `/security`, `/collections`, `/suppliers`, `/admin/risk`

## Post-deploy checks

1. Login with `admin_sai` (password unchanged)
2. Open Security → enable email MFA (dev OTP in API logs if non-prod)
3. Collections dues dashboard loads
4. Risk dashboard (admin) shows capability matrix
