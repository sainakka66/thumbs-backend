# Production MFA Email Security Implementation

## Overview

Production-grade MFA email delivery with verified-email gating, Gmail SMTP support, rate limiting, and audit logging.

## Architecture

```
User registration/update (admin)
  → email on users table (email_verified = 0)
  → User sends verification email (Security page)
  → Token hashed in user_email_verification
  → SMTP sends link to FRONTEND_URL/verify-email?token=...
  → User clicks link → POST /auth/email/verify
  → email_verified = 1, email_verified_at = NOW()

Login
  → Password OK
  → finalizeLogin checks MFA / device
  → sendEmailOtp (requires active account + email_verified)
  → SHA-256 hash stored in user_mfa_email_otp
  → SMTP sends 6-digit OTP (never logged, never in API)
  → User enters OTP → verifyEmailOtp → session issued
```

## Security Controls

| Control | Implementation |
|---------|----------------|
| Email ownership | `users.email_verified`, `users.email_verified_at`, `user_email_verification` |
| MFA only to verified email | `validateUserForOtpDelivery()` in `mfaService.js` |
| Active account check | `is_active`, `status`, `deleted_at` |
| OTP generation | `crypto.randomInt(100000, 999999)` |
| OTP storage | SHA-256 in `user_mfa_email_otp.otp_hash` only |
| OTP expiry | 10 min (`MFA_EMAIL_OTP_EXPIRY_MIN`) |
| One-time use | `used_at` column |
| SMTP TLS | Nodemailer `requireTLS`, `TLSv1.2+` |
| Credentials | `SMTP_*` env vars only — never logged |
| OTP send rate limit | `mfa_otp_send` — 3/user, 5/IP per 15 min, 60s cooldown |
| OTP verify rate limit | `mfa_otp_verify` — brute-force protection |
| Email verify send limit | `email_verify_send` — 3/user per hour |
| Audit events | `mfa_email_sent`, `mfa_otp_verified`, `mfa_otp_failed`, `mfa_otp_expired`, `email_verified`, etc. |

## Never Logged

- Plaintext OTP
- SMTP passwords
- Email verification tokens (only hashes stored)
- Session secrets / JWTs

## Render SMTP connection timeout

If logs show `mfa_email_send_failed` with `Connection timeout`, Render likely cannot reach `smtp.gmail.com:587`. Fixes (in order):

1. **Resend (recommended on Render)** — HTTPS, not blocked:
   ```
   EMAIL_PROVIDER=resend
   RESEND_API_KEY=re_xxxx
   RESEND_FROM=Vaishnavi Agencies <onboarding@resend.dev>
   ```
2. **Gmail SMTP port 465** — set `SMTP_PORT=465`, `SMTP_SECURE=true`, redeploy.
3. Code auto-retries 465 if 587 times out; auto-falls back to Resend if `RESEND_API_KEY` is set.

## Gmail SMTP Setup (Render + Railway free tier)

1. Enable 2FA on Google account.
2. Create App Password: Google Account → Security → App passwords.
3. Set on Render:

```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
SMTP_FROM="Vaishnavi Agencies <your@gmail.com>"
FRONTEND_URL=https://thumbs-up-app-two.vercel.app
```

4. Run migration on Railway:

```bash
npm run migrate:email-mfa
```

5. Existing users with email must verify via Security → Send verification email.

## API Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/email/verify` | Public | Complete email verification from link |
| POST | `/security/email/send-verification` | JWT | Send verification email |
| GET | `/security/email/status` | JWT | Email verification status |
| POST | `/security/mfa/email/enable` | JWT | Enable email MFA (requires verified email) |
| POST | `/security/mfa/email/send` | JWT | Resend MFA OTP (authenticated) |
| POST | `/login/mfa/resend` | Challenge token | Resend OTP during login |
| POST | `/login/mfa/verify` | Challenge token | Verify OTP at login |

## Future Provider Migration

Set `EMAIL_PROVIDER=resend` or `sendgrid` and implement adapter in `lib/email/emailService.js` `sendViaProvider()` — SMTP path unchanged for Gmail.

## Deployment Checklist

- [ ] `npm run migrate:email-mfa` on Railway production
- [ ] SMTP env vars on Render
- [ ] `FRONTEND_URL` matches Vercel deployment
- [ ] Verify email for each MFA user (Security page)
- [ ] Test login → OTP email → verify → success
- [ ] Confirm no OTP in API responses or logs

## Security Review Summary

**Strengths:** Verified-email gate, hashed OTP/tokens, TLS SMTP, rate limits, audit trail, no OTP in responses.

**Operational notes:** Gmail daily send limits apply on free accounts (~500/day). For higher volume, migrate to Resend/SendGrid via `EMAIL_PROVIDER`.

**Admin onboarding:** Users created with email start unverified; admin should communicate verification step before enforcing MFA.
