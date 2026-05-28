# ThumbsUpApp — Deployment Guide

**Project:** ThumbsUpApp  
**Components:** Static frontend · Node.js API · Railway MySQL

---

## 1. Architecture recap

| Component | Platform | Artifact |
|-----------|----------|----------|
| Frontend | Firebase Hosting (optional) or any static host | `index.html` (+ `firebase.json`) |
| Backend API | Render Web Service | `server.js`, `package.json` |
| Database | Railway MySQL | Tables per `DATABASE_SCHEMA.md` |

**Production API URL:** `https://thumbs-backend.onrender.com`  
(hardcoded in `index.html` — update if you change domains)

---

## 2. Prerequisites

- Node.js 18+ locally
- Git repository access
- [Render](https://render.com) account (backend)
- [Railway](https://railway.app) account (MySQL)
- [Firebase CLI](https://firebase.google.com/docs/cli) (optional, frontend)
- [Postman](https://www.postman.com/) (optional, API testing)

---

## 3. Database setup (Railway MySQL)

### 3.1 Initial schema

If tables are missing, run migration SQL in order:

```
migrations/001-recovery-schema.sql
```

Order: `inventory` → `customers` → `sales` → `deliveries`

Or use step scripts:

```bash
node create_inventory.js --allow-server-js-config
node create_customers.js --allow-server-js-config
node create_sales_deliveries.js --allow-server-js-config
```

(requires `DATABASE_URL` or `--allow-server-js-config` — prefer env vars in production)

### 3.2 Verify tables

```sql
SHOW TABLES;
-- Expected: users, inventory, customers, sales, deliveries
```

### 3.3 Users table

Login requires at least one row in `users` (`username`, `password`). Create via Railway SQL console if empty.

---

## 4. Backend deployment (Render)

### 4.1 Service settings

| Setting | Value |
|---------|--------|
| **Type** | Web Service |
| **Runtime** | Node |
| **Build command** | `npm install` |
| **Start command** | `node server.js` |
| **Port** | Render sets `PORT` — **update `server.js` to use `process.env.PORT \|\| 3000`** for production (current code uses fixed `3000`) |

> **Action item:** For Render, change listen to:
> `app.listen(process.env.PORT || 3000, ...)`

### 4.2 Environment variables (recommended)

Set in Render dashboard — **do not commit secrets:**

| Variable | Description |
|----------|-------------|
| `MYSQLHOST` | Railway TCP proxy host |
| `MYSQLPORT` | Railway port |
| `MYSQLUSER` | DB user |
| `MYSQLPASSWORD` | DB password |
| `MYSQLDATABASE` | `railway` |
| `JWT_SECRET` | Strong random secret |
| `PORT` | Set automatically by Render |

Update `server.js` pool config to read from `process.env` instead of hardcoded values before production hardening.

### 4.3 Deploy flow

1. Push changes to GitHub `main` (or connected branch).
2. Render auto-deploys on push (if enabled).
3. Check **Logs** for `Server running on port ...`
4. Hit health check: `POST https://thumbs-backend.onrender.com/login` with test credentials.

### 4.4 When to redeploy backend

Redeploy after changes to:

- `server.js`
- `package.json` (new dependencies)

**No redeploy** for `index.html`-only changes.

---

## 5. Frontend deployment

### 5.1 Option A — Firebase Hosting

Project ID in `.firebaserc`: `vessel-35cca`

```bash
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

`firebase.json` serves the repo root with SPA rewrite to `index.html`.

### 5.2 Option B — Local / other static host

```bash
npx serve -l 5500 .
```

Upload `index.html` to Netlify, Vercel static, Render static site, etc.

### 5.3 When to redeploy frontend

Deploy after changes to:

- `index.html` (UI, API URLs, client logic)

**No redeploy** for backend-only `server.js` changes (unless API base URL changes).

### 5.4 API URL alignment

Frontend currently calls:

```
https://thumbs-backend.onrender.com
```

For local full-stack dev:

- Run `node server.js` on port 3000
- Temporarily replace API URLs in `index.html`, **or** use a local proxy (future improvement)

E2E uses: `API_URL=http://localhost:3000 node e2e-qa.mjs`

---

## 6. Local development

```bash
# Install dependencies
npm install

# Terminal 1 — Backend
node server.js

# Terminal 2 — Frontend
npx serve -l 5500 .

# Open
http://localhost:5500
```

### QA scripts

```bash
node e2e-qa.mjs
node security-check.mjs
```

---

## 7. Post-deploy verification

| Step | Command / action | Expected |
|------|------------------|----------|
| 1 | `POST /login` | `{ success: true, token }` |
| 2 | `GET /products/stats` + Bearer | 200, numeric/null stats |
| 3 | Open app, login | Dashboard visible, loader gone |
| 4 | `node security-check.mjs` against prod URL | All pass |
| 5 | Record test sale | Stock decreases |

---

## 8. Rollback

| Layer | Action |
|-------|--------|
| Render | Redeploy previous commit from Render dashboard |
| Firebase | `firebase hosting:rollback` or redeploy prior version |
| Database | Railway snapshot restore; avoid `DROP` in production |

---

## 9. Security checklist before go-live

See **SECURITY.md** and copy **`.env.example`** to configure Render.

- [ ] Set `DATABASE_URL` or `MYSQL*` on Render (no credentials in `server.js`)
- [ ] Set `JWT_SECRET` (min 32 chars) and rotate any previously exposed secret
- [ ] Set `CORS_ORIGINS` to your Vercel URL(s)
- [ ] Run `node scripts/hash-user-password.js --username <admin>` after deploy
- [ ] Confirm `DELETE /deliveries/:id` has `verifyToken` (`node security-check.mjs`)
- [ ] Redeploy Vercel for static security headers in `vercel.json`
- [ ] Disable or remove demo/test DB users; blocked names include `demo`, `test`, `guest`

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| 500 on all APIs except login | Missing tables | Run `001-recovery-schema.sql` |
| Dashboard spinner forever | Old `index.html` without `loadStats` fix | Deploy updated frontend |
| 403 on APIs | Missing/expired token | Re-login |
| Stock not decreasing | Old `server.js` on Render | Redeploy backend |
| CORS errors | API URL mismatch | Align frontend base URL |
| Render port bind fail | Hardcoded port 3000 | Use `process.env.PORT` |

---

## 11. File deploy matrix

| File | Frontend deploy | Backend deploy | DB migration |
|------|-----------------|----------------|--------------|
| `index.html` | Yes | No | No |
| `server.js` | No | Yes | No |
| `package.json` | No | Yes | No |
| `migrations/*.sql` | No | No | Yes (manual) |
| `firebase.json` | Yes | No | No |
