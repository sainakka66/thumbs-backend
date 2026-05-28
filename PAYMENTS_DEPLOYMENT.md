# UPI Payments — Production Deployment Guide

Enterprise Razorpay UPI infrastructure for Thumbs Up Distribution (React/Vite + Express + MySQL).

## Architecture

```
frontend/          → Vercel (PWA, Razorpay Checkout.js — public key only)
server.js          → Render (Express + Socket.IO + webhooks)
payments/          → Payment domain (services, fraud, routes)
migrations/002-*   → MySQL payment schema
```

## 1. Database migration

On Railway MySQL (or local):

```bash
npm run migrate:payments
npm run migrate:security
```

See also `SECURITY_PRODUCTION_CHECKLIST.md` before go-live.

Or run `migrations/002-payments-schema.sql` manually in MySQL Workbench.

Grant admin role to an existing user:

```sql
UPDATE users SET role = 'admin' WHERE username = 'your_admin';
```

## 2. Razorpay setup

1. Create a Razorpay account → enable **UPI** in Dashboard → Settings → Payment methods.
2. Copy **Key ID** and **Key Secret** (Test/Live).
3. Webhooks → Add endpoint:
   - URL: `https://thumbs-backend.onrender.com/payments/webhook`
   - Events: `payment.captured`, `payment.failed`, `order.paid`
   - Copy **Webhook Secret**.

## 3. Render environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `RAZORPAY_KEY_ID` | Yes | Public key (also used server-side for orders) |
| `RAZORPAY_KEY_SECRET` | Yes | **Server only** |
| `RAZORPAY_WEBHOOK_SECRET` | Yes | Webhook HMAC verification |
| `JWT_SECRET` | Yes | Existing (min 32 chars) |
| `CORS_ORIGINS` | Yes | Include Vercel URL |
| `DATABASE_URL` | Yes | Existing MySQL |

Redeploy Render after setting variables.

## 4. Vercel frontend

No Razorpay secrets on Vercel. Only:

- `VITE_API_BASE_URL=https://thumbs-backend.onrender.com`

Deploy from `frontend/` (see `frontend/README.md`).

## 5. API endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/payments/create-order` | JWT | Create Razorpay order + DB record |
| POST | `/payments/verify` | JWT | Verify signature after checkout |
| POST | `/payments/webhook` | HMAC | Razorpay webhook (raw body) |
| GET | `/payments/status/:id` | JWT | Poll order status |
| GET | `/payments/history` | JWT | User payment history |
| POST | `/payments/refund` | Admin | Initiate refund |
| POST | `/risk/analyze` | JWT | Pre-payment risk check |
| POST | `/admin/block-user` | Admin | Block user from payments |

## 6. Real-time updates

Socket.IO connects to the same host as the API:

- Path: `/socket.io`
- Auth: `{ token: <JWT> }` in handshake
- Events: `payment:update`, `payment:admin`

## 7. Security checklist

- [ ] HTTPS only (Vercel + Render)
- [ ] Webhook secret configured
- [ ] JWT secret ≥ 32 characters
- [ ] Admin users have `role = 'admin'` in DB
- [ ] CORS lists production frontend only (+ dev origins if needed)
- [ ] No `RAZORPAY_KEY_SECRET` in frontend env
- [ ] Run migration `002` before first payment

## 8. PWA / offline

- Failed payment API calls while offline are queued in `localStorage` (`tu_offline_payments`).
- On reconnect, queue flushes via `create-order` (idempotent keys).
- Service worker does **not** cache payment secrets or card data.

## 9. Testing

1. Use Razorpay **test mode** keys.
2. Sign in → Customers → Record Payment → **Pay via UPI**.
3. Complete test UPI flow in Razorpay modal.
4. Verify status on **UPI Payments** page.
5. Admin: `/admin/payments` and `/admin/fraud` (admin role only).

## 10. Folder structure

```
payments/
  fraud/fraudEngine.js
  middleware/
  repositories/
  routes/
  services/
  validators/
  socket.js
  index.js
lib/
  db.js
  logger.js
  errors.js
config/
  paymentConfig.js
migrations/
  002-payments-schema.sql
frontend/src/
  services/paymentService.js
  hooks/usePayment.js
  hooks/usePaymentSocket.js
  components/payments/PaymentModal.jsx
  pages/PaymentsPage.jsx
  pages/admin/
```
