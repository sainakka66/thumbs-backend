# Security Report — Production Roadmap Phase 1

**Branch:** `main` · **Date:** 2026-05-31

## Implemented

| Capability | Status | Notes |
|------------|--------|-------|
| MFA — TOTP | Implemented | `otplib`, encrypted secret, QR `otpauthUrl` |
| MFA — Email OTP | Implemented | Hashed OTP table; dev OTP in logs when non-production |
| MFA — Backup codes | Implemented | 10 one-time codes, SHA-256 hashed |
| MFA optional / admin enforce | Implemented | `mfa_enforced` on users + `POST /security/admin/enforce-mfa/:userId` |
| Device fingerprinting | Implemented | `X-Device-Fingerprint` + `deviceSignals` on login |
| Trusted device registry | Implemented | `trusted_devices` extended; verify via email OTP |
| New device detection | Implemented | Login challenge when device unverified |
| Session management | Implemented | `user_sessions` populated on login; list/revoke APIs |
| Login rate limiting | Existing + enhanced | `enterpriseLimiter` + `login_attempts` + `account_lockouts` |
| Failed login tracking | Implemented | `login_attempts` table |
| Account lockouts | Implemented | After 5 failures / 15 min window (env configurable) |
| Suspicious login scoring | Implemented | `riskLoginService` — VPN headers, automation UA, impossible travel |
| Security audit (immutable) | Implemented | `security_audit_events` + dual-write to `audit_logs` |

## API routes

- `POST /login` — may return `challengeRequired` + `pendingToken`
- `POST /login/mfa/verify` — complete MFA/device challenge
- `/security/*` — MFA, sessions, devices, admin audit events

## Migration

`npm run migrate:roadmap-security` → `migrations/008-roadmap-security.sql`

## Frontend

- `/security` — MFA enrollment, sessions, devices
- Login challenge UI for MFA/device verification

## Partial / follow-up

- Email delivery requires `SMTP_*` env (OTP generated regardless)
- Push notification on new device login (Phase 3)
- Hardware security key / WebAuthn (not in scope)
