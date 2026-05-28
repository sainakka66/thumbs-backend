# Security — production checklist

## Before going public

1. **Environment variables** — Copy `.env.example` to `.env` locally; set all secrets in Render (backend) and never commit `.env`.
2. **JWT_SECRET** — At least 32 random characters (`openssl rand -base64 48`). Rotate if ever exposed.
3. **Database** — Use `DATABASE_URL` or `MYSQL*` vars only; remove any credentials from git history if they were committed.
4. **Hash passwords** — Existing plaintext passwords must be migrated:
   ```bash
   node scripts/hash-user-password.js --username your_admin_user
   ```
   Users can still sign in once with the old password; the server re-hashes on first successful login (legacy upgrade).
5. **CORS** — Set `CORS_ORIGINS` to your exact Vercel (and custom) domains, comma-separated.
6. **Demo accounts** — Usernames like `demo`, `test`, `guest` are blocked by default. Add more via `DISABLED_USERNAMES`.
7. **HTTPS** — Vercel and Render provide TLS; do not serve the API over plain HTTP in production.
8. **Render** — Redeploy after env changes. Enable auto-deploy from protected branches only.

## What the app enforces

| Control | Implementation |
|--------|----------------|
| Password policy | Min 12 chars, upper, lower, digit, special (`config.validatePassword`) |
| Storage | bcrypt (cost 12 default) |
| Login | Rate limit 10 / 15 min per IP; generic error messages |
| JWT | From `JWT_SECRET`; 1h expiry (configurable) |
| Headers | Helmet on API; Vercel security headers on static frontend |
| Logout | Client clears token + form fields; optional `POST /logout` |

## Frontend

- No API keys or passwords in `index.html`.
- Token stored in `localStorage` only after successful login.
- Sign-up remains disabled in UI; create users in the database and hash passwords with the script.

## If credentials were exposed

1. Rotate DB password in Railway.
2. Generate new `JWT_SECRET` (invalidates all sessions).
3. Re-hash all user passwords.
4. Review git history and force-push only if you understand the impact.

## Ongoing

- Run `npm audit` and patch dependencies.
- Keep `security-check.mjs` in CI with `JWT_SECRET` from env.
- Use strong unique passwords per operator; never share the `admin` account.
