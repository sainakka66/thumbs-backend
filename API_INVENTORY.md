# API Inventory — Thumbs Up Distribution System

**Generated from source** (`server.js`, `business/`, `payments/`). No invented endpoints — every route below maps to a real handler.

- **Base URL (prod):** `https://thumbs-backend.onrender.com`
- **Base URL (local):** `http://localhost:3000` (or `/api` via Vite dev proxy on `:5173`)
- **No `/api` prefix** on the backend — routes are served at the root (e.g. `/login`, `/products`).
- **Auth:** JWT Bearer. `POST /login` returns `{ success, token, role, permissions[] }`. Send `Authorization: Bearer <token>` on all protected routes.
- **RBAC:** Each protected route requires a permission slug (`enforce(...)` / `protect(...)`). Role **ADMIN bypasses all permission checks**. Roles: `ADMIN`, `MANAGER`, `SALESPERSON`, `DELIVERY`, `CUSTOMER`.
- **Errors:** JSON `{ success:false, message }`. `401` missing/invalid token, `403` insufficient permission, `400` validation, `404` not found, `500` server error, `503` DB unavailable.

---

## Route registration map

| Source | Mount | Notes |
|--------|-------|-------|
| `server.js` | root (`app.get/post/...`) | auth, products, customers, sales, deliveries, legacy dashboard |
| `business/index.js` | `app.use(router)` (root) | dashboard, search, stock-alerts, notifications, audit, reports, pdf, rbac |
| `business/routes/usersRoutes.js` | `app.use('/users', ...)` | user management |
| `payments/index.js` | `/payments`, `/risk`, `/admin` | payments, risk, admin payment ops |
| `payments` webhook | `POST /payments/webhook` | Razorpay signature (no JWT) |

---

## 1. Authentication

| Method | URL | Auth | Permission | Body | Success | Error |
|--------|-----|------|-----------|------|---------|-------|
| GET | `/health` | none | — | — | `200 {ok,database,users,jwt}` | `500` |
| POST | `/login` | none | — | `{username,password}` | `200 {success,token,role,permissions[]}` | `200 {success:false}` / `403` / `503` |
| POST | `/logout` | Bearer | — | — | `200 {success}` | `401` |
| GET | `/rbac/me` | Bearer | `dashboard.view` | — | `200 {success,user,permissions[]}` | `401/403` |
| POST | `/auth/change-password` | Bearer | (auth only) | `{currentPassword,newPassword}` | `200 {success}` | `400/404` |

`POST /login` rate-limited (`LOGIN_RATE_LIMIT_MAX`, default 10). Password policy enforced on change-password.

## 2. Users (`/users`) — all require `users.manage`

| Method | URL | Body / Query | Success | Error |
|--------|-----|--------------|---------|-------|
| GET | `/users` | query `includeDeleted=1` | `200 {success,users[]}` | `403` |
| GET | `/users/roles/list` | — | `200 {success,roles[]}` | `403` |
| GET | `/users/:id` | path `id` | `200 {success,user}` | `404` |
| POST | `/users` | `{username,password,email?,phone?,roleSlug}` | `201 {success,user}` | `400/409` |
| PUT | `/users/:id` | `{email?,phone?,roleSlug?}` | `200 {success,user}` | `400/404` |
| PATCH | `/users/:id/status` | `{status?,is_active?}` | `200 {success,user}` | `400/404` |
| POST | `/users/:id/reset-password` | `{password}` | `200 {success}` | `400/404` |
| DELETE | `/users/:id` | path `id` (soft delete) | `200 {success}` | `400/404` |

`roleSlug` ∈ `ADMIN|MANAGER|SALESPERSON|DELIVERY|CUSTOMER`. Cannot deactivate/delete own account.

## 3. Customers

| Method | URL | Auth Permission | Body | Success |
|--------|-----|-----------------|------|---------|
| GET | `/customers` | `customers.view` | — | `200 [customers]` |
| POST | `/customers` | `customers.create` | `{shop_name,owner_name,phone,email,address,area,credit_limit,opening_balance}` | `200 {success,id}` |
| PUT | `/customers/:id` | `customers.update` | customer fields | `200 {success}` |
| DELETE | `/customers/:id` | `customers.delete` | — | `200 {success}` |
| POST | `/customers/:id/pay` | `customers.update` | `{amount}` | `200 {success,newDue}` / `400` invalid amount |

## 4. Inventory / Products

| Method | URL | Auth Permission | Body / Query | Success |
|--------|-----|-----------------|--------------|---------|
| GET | `/products` | `inventory.view` | query `page` (5/page) | `200 [products]` |
| GET | `/inventory` | `inventory.view` | — | `200 [products]` |
| GET | `/products/search/:key` | `inventory.view` | path `key`, query `page` | `200 [products]` |
| GET | `/products/stats` | `inventory.view` | — | `200 {totalProducts,totalStock,lowStock,totalValue}` |
| POST | `/products` | `inventory.create` | `{Name,quantity,price,sku,category,size,bpc,reorder}` | `200 {success,id}` |
| PUT | `/products/:id` | `inventory.update` | product fields | `200 {success}` |
| DELETE | `/products/:id` | `inventory.delete` | — | `200 {success}` |

## 5. Sales

| Method | URL | Auth Permission | Body | Success |
|--------|-----|-----------------|------|---------|
| GET | `/sales` | `sales.view` | — | `200 [sales]` |
| POST | `/sales` | `sales.create` | `{customer_id,product_name,quantity,price_per_case,total_amount,amount_paid,payment_mode,notes}` | `200 {success}` / `400` |
| DELETE | `/sales/:id` | `sales.delete` | — | `200 {success}` |

## 6. Deliveries

| Method | URL | Auth Permission | Body / Query | Success |
|--------|-----|-----------------|--------------|---------|
| GET | `/deliveries` | `deliveries.view` OR `deliveries.view_own` | query `status` | `200 [deliveries]` |
| POST | `/deliveries` | `deliveries.create` | `{customer_id,product_name,quantity,delivery_date,driver_name,vehicle_no,status,notes,assigned_user_id?}` | `200 {success}` / `400` |
| PUT | `/deliveries/:id` | `deliveries.update` | `{status?,notes?,driver_name?,vehicle_no?}` | `200 {success}` / `403` not your delivery / `404` |
| DELETE | `/deliveries/:id` | `deliveries.delete` | — | `200 {success}` |

DELIVERY-role users only see/update their own assigned deliveries.

## 7. Dashboard

| Method | URL | Auth Permission | Notes |
|--------|-----|-----------------|-------|
| GET | `/dashboard/summary` | `dashboard.view` | **Aggregated** (sales, revenue, inventory, alerts, notifications, charts; `admin` block if `users.manage`) |
| GET | `/dashboard/executive` | `dashboard.view` | full executive payload |
| GET | `/dashboard/admin` | `users.manage` | users + recent audit + sales today |
| GET | `/dashboard/recent-sales` | `dashboard.view` | legacy |
| GET | `/dashboard/top-customers` | `dashboard.view` | legacy |
| GET | `/dashboard/today-revenue` | `dashboard.view` | legacy |
| GET | `/dashboard/weekly-sales` | `dashboard.view` | legacy |
| GET | `/search` | `dashboard.view` | query `q` |

## 8. Notifications

| Method | URL | Auth Permission | Body / Query | Success |
|--------|-----|-----------------|--------------|---------|
| GET | `/notifications` | `notifications.view` | query `unread=1` | `200 {success,items[],unreadCount}` |
| PATCH | `/notifications/:id/read` | `notifications.view` | — | `200 {success}` |
| POST | `/notifications/read-all` | `notifications.view` | — | `200 {success}` |
| GET | `/stock-alerts` | `inventory.view` | — | `200 {success,alerts[]}` |
| POST | `/stock-alerts/sync` | `inventory.update` | — | `200 {success,count,alerts}` |

## 9. Audit Logs

| Method | URL | Auth Permission | Query | Success |
|--------|-----|-----------------|-------|---------|
| GET | `/audit/logs` | `audit.view` | `userId,action,entityType,from,to,limit(≤500),offset,format=csv` | `200 {success,logs[],total,limit,offset}` or CSV |

## 10. Reports & PDF

| Method | URL | Auth Permission | Notes |
|--------|-----|-----------------|-------|
| GET | `/reports/:type` | `reports.view` | type ∈ `sales|inventory|customers|deliveries`; query `range,from,to,format=json|csv|excel` |
| GET | `/pdf/sales-invoice/:id` | `sales.view` | PDF |
| GET | `/pdf/delivery-challan/:id` | `deliveries.view` | PDF |
| GET | `/pdf/inventory-report` | `reports.export` | PDF |
| GET | `/pdf/customer-statement/:id` | `customers.view` | PDF |

## 11. Payments (`/payments`, `/risk`)

| Method | URL | Auth | Body / Query | Success |
|--------|-----|------|--------------|---------|
| POST | `/payments/create-order` | Bearer | `{amount,customerId?,distributorId?,idempotencyKey?,description?}` | `200 {order...}` |
| POST | `/payments/verify` | Bearer | `{orderUuid,razorpayOrderId,razorpayPaymentId,razorpaySignature}` | `200 {verified...}` |
| GET | `/payments/status/:id` | Bearer | path `id` | `200 {status...}` |
| GET | `/payments/history` | Bearer | query `limit,offset,status` | `200 {success,payments[]}` |
| POST | `/payments/refund` | Bearer + **ADMIN** | refund body | `200` |
| POST | `/risk/analyze` | Bearer | `{amount,customerId?}` | `200 {riskScore,riskCategory,action,...}` |
| POST | `/payments/webhook` | **none** (Razorpay signature) | raw JSON + `x-razorpay-signature` | `200/400 {ok}` |

## 12. Admin (`/admin`) — all require role **ADMIN** + IP allowlist + session timeout

| Method | URL | Body / Query | Success |
|--------|-----|--------------|---------|
| GET | `/admin/payments/monitor` | query `limit,offset,status,flagged=1` | `200 {success,payments[],weeklyStats}` |
| GET | `/admin/payments/fraud-queue` | — | `200 {success,items[]}` |
| GET | `/admin/payments/webhooks` | — | `200 {success,webhooks[]}` |
| POST | `/admin/payments/refund/request` | `{orderUuid}` | `200 {success,approvalId,status:PENDING}` |
| POST | `/admin/block-user` | `{userId,reason}` | `200 {success}` |
| POST | `/admin/unblock-user` | `{userId}` | `200 {success}` |
| POST | `/admin/payments/review/:id` | path `id` | `200 {success}` |

---

## Permission → role matrix (from `migrations/004` & `006`)

| Permission | ADMIN | MANAGER | SALESPERSON | DELIVERY | CUSTOMER |
|-----------|:----:|:------:|:----------:|:-------:|:-------:|
| dashboard.view | ✓ | ✓ | ✓ | ✓ | — |
| inventory.view/create/update/delete | ✓ | view/create/update | view | — | — |
| customers.view/create/update/delete | ✓ | ✓ | view/create/update | — | — |
| sales.view/create/delete | ✓ | ✓ | view/create | — | — |
| deliveries.view/create/update/delete | ✓ | ✓ | view | view_own/update | — |
| reports.view/export | ✓ | ✓ | — | — | — |
| notifications.view | ✓ | ✓ | ✓ | ✓ | — |
| audit.view | ✓ | — | — | — | — |
| users.manage | ✓ | — | — | — | — |
| payments.view | ✓ | ✓ | ✓ | — | — |
| portal.view | — | — | — | — | ✓ |

> ADMIN passes all permission checks regardless of explicit grants. Exact grants are defined in the `role_permissions` table; the matrix above reflects the seed migrations.

**Total documented endpoints: 65** (see `ThumbsUp_Postman_Collection.json`).
