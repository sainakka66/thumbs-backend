# Postman Setup Guide — Thumbs Up Distribution System

Everything you need to test the entire API without the UI. Files live in the `postman/` folder.

| File | Purpose |
|------|---------|
| `postman/ThumbsUp_Postman_Collection.json` | All 65 endpoints, 13 folders, token capture, CRUD + RBAC tests |
| `postman/ThumbsUp_Local.postman_environment.json` | Local env (`http://localhost:3000`) |
| `postman/ThumbsUp_Production.postman_environment.json` | Production env (`https://thumbs-backend.onrender.com`) |
| `API_INVENTORY.md` | Full endpoint reference |
| `POSTMAN_TEST_DATA.md` | Sample payloads / seed data |
| `API_HEALTH_REPORT.md` | Live validation results |
| `swagger.json` + `/api/docs` | OpenAPI spec & Swagger UI |

---

## 1. Import the collection
1. Open Postman → **Import** (top left).
2. Drag in `postman/ThumbsUp_Postman_Collection.json` (or **Upload Files**).
3. The collection **“Thumbs Up Distribution System API”** appears with 13 folders.

## 2. Import the environments
1. **Import** both `ThumbsUp_Local.postman_environment.json` and `ThumbsUp_Production.postman_environment.json`.
2. Top-right **environment selector** → pick **ThumbsUp Production** (or Local).
3. Open the environment and fill in the secrets (they ship as placeholders):
   - `password` — password for the `username` (default `admin_sai`).
   - `admin_pw`, `manager_pw`, `sales_pw`, `delivery_pw`, `customer_pw` — for the RBAC Tests folder.
   - Get these from the output of `npm run seed:enterprise` (printed once at seed time).

## 3. How to log in
1. Open **Authentication → Login** and **Send**.
2. The test script runs automatically:
   ```javascript
   const res = pm.response.json();
   if (res.token) pm.environment.set("token", res.token);
   if (res.role)  pm.environment.set("role", res.role);
   ```
3. You should see `{ success:true, token, role, permissions[] }` and the `token` variable populated.

## 4. How token management works
- The **collection-level auth** is `Bearer {{token}}`, so every request inherits the token automatically — no manual header needed.
- Public requests override this with **No Auth**: `Login`, `Health`, and `Payments → Webhook`.
- **Token lifetime:** JWT expires after `JWT_EXPIRES_IN` (default **1 hour**). There is **no refresh-token endpoint** in the backend — simply re-run **Login** to get a fresh token. (`refreshToken` exists in the environment only as a placeholder for future use.)
- A `401` means the token is missing/expired → re-run Login. A `403` means you’re authenticated but lack the permission/role.

## 5. How to execute CRUD operations
The collection chains IDs automatically via test scripts. Recommended order:
1. **Login**.
2. **Customers → List Customers** (captures `customerId`) or **Create Customer** (captures the new `customerId`).
3. **Inventory → Create Product** (captures `inventoryId`).
4. **Sales → Create Sale** (uses `{{customerId}}`), then **List Sales** (captures `saleId`).
5. **Deliveries → Create Delivery**, then **List Deliveries** (captures `deliveryId`).
6. **Notifications → List Notifications** (captures `notificationId`).
7. Update/Delete requests reuse the captured `{{...Id}}` variables.

> Tip: use Postman’s **Collection Runner** on a folder to run create→read→update→delete in sequence. Captured variables flow between requests.

## 6. Which APIs require Admin access
**Role `ADMIN` bypasses all permission checks.** These specifically require ADMIN (or `users.manage` / `audit.view`):

| Area | Endpoints |
|------|-----------|
| Users | all `/users*` (`users.manage`) |
| Audit | `GET /audit/logs` (`audit.view`) |
| Admin dashboard | `GET /dashboard/admin` (`users.manage`) |
| Payments admin | `/admin/payments/*`, `/admin/block-user`, `/admin/unblock-user` (role **ADMIN** + IP allowlist + session timeout) |
| Refunds | `POST /payments/refund` (role ADMIN) |

The **RBAC Tests** folder logs in as each role and asserts allowed (`200`) vs forbidden (`403`) endpoints — run it to see the matrix in action.

## 7. Which APIs are safe for testing
**Safe (read-only):** all `GET` endpoints — dashboard, lists, reports, stats, search, PDFs, audit, notifications.

**Safe (creates test rows you can delete):** Customers / Inventory / Sales / Deliveries CRUD. Note: deleting a **customer** that has sales/deliveries returns an error (FK protected) — delete its sales/deliveries first.

**Use caution:**
- `POST /auth/change-password` — changes your password (you’ll need the new one to log in again).
- `POST /logout` — ends the session (re-login after).
- `DELETE /users/:id` — soft-deletes a user (you can’t delete your own account).
- `POST /admin/block-user` — bans a user account.

**Cannot fully test without external setup:**
- `POST /payments/create-order`, `/payments/verify`, `/payments/refund` — need live Razorpay keys/checkout.
- `POST /payments/webhook` — needs a valid Razorpay signature.

---

## API docs (Swagger / OpenAPI)
- Spec file: **`swagger.json`** (OpenAPI 3.0, 55 paths).
- Interactive UI: **`/api/docs`** (e.g. `https://thumbs-backend.onrender.com/api/docs`).
- Raw spec served at **`/api/docs.json`** and **`/swagger.json`**.
- Import `swagger.json` into Postman too (**Import → OpenAPI**) if you prefer a spec-generated collection.

## Quick reference
- **Base URLs:** prod `https://thumbs-backend.onrender.com`, local `http://localhost:3000`.
- **No `/api` prefix** on data routes (e.g. `/login`, `/products`). Only the docs live under `/api/docs`.
- **Auth header:** `Authorization: Bearer <token>` (auto-applied by the collection).
- **Rate limit:** `POST /login` is limited (default 10 attempts) — a `429` means wait and retry.
