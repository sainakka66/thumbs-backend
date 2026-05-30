# API Health Report — Thumbs Up Distribution System

**Date:** 2026-05-30  
**Target:** `https://thumbs-backend.onrender.com` (production)  
**Method:** Authenticated as `admin_sai` (ADMIN), executed a live pass over read endpoints + a full CRUD lifecycle (create → update → delete), then cleaned up all test rows.

---

## Summary

| Result | Count |
|--------|-------|
| Endpoints executed live | 46 calls |
| `2xx` healthy | **45** |
| `5xx` / errors | **1** |
| Broken / dead routes | 0 |
| Missing controllers/services | 0 |

All routes resolve to real handlers — **no dead routes, no missing controllers/services**. Latency averaged ~300 ms (RTT floor from test location).

---

## Live results (200 unless noted)

**Auth & RBAC:** `/health`, `POST /login`, `/rbac/me` — OK.  
**Users:** `GET /users`, `GET /users/roles/list` — OK.  
**Customers:** `GET /customers`, `POST /customers`, `PUT /customers/:id`, `POST /customers/:id/pay` — OK.  
**Inventory:** `GET /products`, `/inventory`, `/products/stats`, `/products/search/:key`, `POST /products`, `PUT /products/:id`, `DELETE /products/:id` — OK.  
**Sales:** `GET /sales`, `POST /sales` — OK.  
**Deliveries:** `GET /deliveries`, `POST /deliveries` — OK.  
**Dashboard:** `/dashboard/summary`, `/executive`, `/admin`, `/recent-sales`, `/top-customers`, `/today-revenue`, `/weekly-sales`, `/search` — OK.  
**Notifications:** `GET /notifications`, `PATCH /notifications/:id/read`, `GET /stock-alerts`, `POST /stock-alerts/sync` — OK.  
**Audit:** `GET /audit/logs` — OK.  
**Reports:** `/reports/{sales,inventory,customers,deliveries}` — OK.  
**PDF:** `/pdf/sales-invoice/:id`, `/pdf/delivery-challan/:id`, `/pdf/inventory-report`, `/pdf/customer-statement/:id` — OK.  
**Payments/Admin:** `GET /payments/history`, `GET /admin/payments/monitor`, `/admin/payments/fraud-queue`, `/admin/payments/webhooks` — OK.

---

## Issues found

### 1. `DELETE /customers/:id` returns **500** instead of 409 (real bug)
- **Repro:** delete a customer that has dependent `sales`/`deliveries`.
- **Cause:** FK constraints `fk_sales_customer` / `fk_deliveries_customer` use `ON DELETE RESTRICT`. The handler catches the DB error and returns `500 {message}` (raw SQL error) rather than a clean `409 Conflict`.
- **Impact:** Confusing client error; looks like a server crash. (Once dependent sales/deliveries are removed, the delete succeeds — verified.)
- **Recommendation:** Detect `ER_ROW_IS_REFERENCED_2` and return `409 { success:false, message:"Customer has sales/deliveries and cannot be deleted" }`.

### 2. Inconsistent response envelopes (observation, not breaking)
- `server.js` routes (products, customers, sales, deliveries) return **raw arrays** on success and `res.status(500).json(err)` on failure (sometimes the raw error object).
- `business/` routes return `{ success, ... }` consistently.
- **Recommendation:** Standardize on `{ success, data }` and JSON error `{ success:false, message }` across `server.js` too.

### 3. Error bodies sometimes leak raw driver errors
- Several `server.js` catch blocks do `res.status(500).json(err)` / `json({message: err.message})`, exposing SQL messages.
- **Recommendation:** Route through the existing `sendJsonError` helper.

---

## Endpoints NOT executed in the automated run (by design — not failures)

| Endpoint | Why skipped |
|----------|-------------|
| `POST /logout` | Would invalidate the working session mid-run |
| `POST /auth/change-password` | Would change the admin password |
| `POST /users`, `PUT/PATCH/DELETE /users/:id`, `reset-password` | Avoid mutating real user accounts on prod (GET paths verified) |
| `DELETE /sales/:id`, `DELETE /deliveries/:id` | Verified via cleanup (returned 200) |
| `POST /payments/create-order`, `/payments/verify`, `/payments/refund` | Require live Razorpay credentials/checkout |
| `POST /risk/analyze` | Requires fraud-provider config; safe to run manually |
| `POST /payments/webhook` | Requires valid Razorpay signature |
| `POST /admin/block-user`, `/unblock-user`, `/refund/request`, `/payments/review/:id` | Destructive admin actions; validated by code review |

These are present and wired (handlers + services exist); they were excluded from the automated destructive pass, not found broken. Use the Postman collection to exercise them individually.

---

## Dead code / coverage check
- **Dead routes:** none. Every `app.*`/`router.*` registration maps to a handler.
- **Unused endpoints:** `/dashboard/recent-sales`, `/top-customers`, `/today-revenue`, `/weekly-sales` are **legacy** (superseded by `/dashboard/summary`) but still functional — candidates for future removal, not broken.
- **Missing services:** none — all referenced services (`dashboardService`, `userService`, `reportService`, `pdfService`, `notificationService`, `stockAlertService`, `paymentService`, etc.) resolved and returned data.

---

## Verdict

The API is **healthy**: 45/46 live calls returned `2xx`; the single `500` is a known FK-delete edge case with a clear fix. No dead routes or missing handlers. Recommended fixes are non-blocking quality improvements (consistent envelopes, `409` on constrained delete, no raw error leakage).
