# ThumbsUpApp — API Documentation

**Base URL (production):** `https://thumbs-backend.onrender.com`  
**Base URL (local):** `http://localhost:3000`  
**Auth:** JWT Bearer token (except login)  
**Content-Type:** `application/json`

---

## Authentication

### Login

```http
POST /login
```

**Auth required:** No

**Request body:**

```json
{
  "username": "admin",
  "password": "your_password"
}
```

**Success (200):**

```json
{
  "success": true,
  "token": "<jwt>"
}
```

**Failure (200 with success false):**

```json
{
  "success": false,
  "message": "User not found"
}
```

or

```json
{
  "success": false,
  "message": "Wrong password"
}
```

**Token payload:** `{ id, username }` — expires in **1 hour**.

### Using the token

```http
Authorization: Bearer <token>
```

| Condition | Status | Body |
|-----------|--------|------|
| No header | 403 | `"No token"` |
| Invalid/expired token | 401 | `"Invalid token"` |

---

## Products / Inventory

Table: `inventory` (column ``Name`` uses capital N).

### List products (paginated)

```http
GET /products?page=1
```

**Query:** `page` (default 1), **5 rows per page**.

**Response (200):** Array of inventory rows.

### Search products

```http
GET /products/search/:key?page=1
```

Searches ``Name`` and `sku` with `LIKE %key%`.

### List all inventory

```http
GET /inventory
```

**Response (200):** Full inventory array (no pagination).

### Product stats (dashboard)

```http
GET /products/stats
```

**Response (200):**

```json
{
  "totalProducts": 0,
  "totalStock": null,
  "lowStock": null,
  "totalValue": null
}
```

> `SUM()` fields may be `null` when inventory is empty. Frontend coerces to `0`.

### Create product

```http
POST /products
```

**Body:**

```json
{
  "Name": "Product Name",
  "quantity": 100,
  "price": 1200,
  "sku": "SKU-001",
  "category": "Beer",
  "size": "650ml",
  "bpc": 24,
  "reorder": 10
}
```

**Response (200):**

```json
{ "success": true, "id": 1 }
```

### Update product

```http
PUT /products/:id
```

Same body fields as create.

**Response (200):**

```json
{ "success": true }
```

### Delete product

```http
DELETE /products/:id
```

**Response (200):**

```json
{ "success": true }
```

---

## Customers

### List customers

```http
GET /customers
```

**Response (200):** Array ordered by `shop_name`.

### Create customer

```http
POST /customers
```

**Body:**

```json
{
  "shop_name": "ABC Store",
  "owner_name": "Owner",
  "phone": "9999999999",
  "email": "shop@example.com",
  "address": "Address",
  "area": "North",
  "credit_limit": 50000,
  "opening_balance": 0
}
```

**Response (200):**

```json
{ "success": true, "id": 1 }
```

### Update customer

```http
PUT /customers/:id
```

**Body:** `shop_name`, `owner_name`, `phone`, `email`, `address`, `area`, `credit_limit` (no `opening_balance` in update).

### Delete customer

```http
DELETE /customers/:id
```

Fails with FK error if related `sales` or `deliveries` exist (`ON DELETE RESTRICT`).

### Record payment

```http
POST /customers/:id/pay
```

**Body:**

```json
{ "amount": 5000 }
```

**Response (200):**

```json
{ "success": true, "newDue": 0 }
```

**Errors:** `400` invalid amount, `404` customer not found.

---

## Sales

### List sales

```http
GET /sales
```

**Headers:** `Cache-Control: no-store`

**Response (200):** Array with fields including `date` (from `created_at`), `customer_name`.

### Create sale

```http
POST /sales
```

**Body:**

```json
{
  "customer_id": 1,
  "product_name": "Product Name (650ml)",
  "quantity": 5,
  "price_per_case": 1200,
  "total_amount": 6000,
  "amount_paid": 6000,
  "payment_mode": "Cash",
  "notes": "Optional"
}
```

**Side effects (transaction):**

1. Inserts `sales` row.
2. Reduces `inventory.quantity` where ``Name`` matches product name (text before `(` if present).
3. Updates `customers.outstanding_balance` based on unpaid balance.

**Response (200):**

```json
{ "success": true }
```

**Errors:** `400` if `customer_id` missing.

### Delete sale

```http
DELETE /sales/:id
```

**Response (200):**

```json
{ "success": true }
```

> Does not restore inventory or customer balance.

---

## Deliveries

All delivery routes require JWT.

### List deliveries

```http
GET /deliveries
GET /deliveries?status=Pending
```

**Response (200):** Delivery rows + `customer_name` from join.

Status filter is case-insensitive (trim + lower).

### Create delivery

```http
POST /deliveries
```

**Body:**

```json
{
  "customer_id": 1,
  "product_name": "Product",
  "quantity": 2,
  "delivery_date": "2026-05-28",
  "driver_name": "Driver",
  "vehicle_no": "MH-01-AB-1234",
  "status": "Pending",
  "notes": ""
}
```

**Response (200):**

```json
{ "success": true }
```

### Delete delivery

```http
DELETE /deliveries/:id
```

**Auth:** Required (`verifyToken`)

**Response (200):**

```json
{ "success": true }
```

---

## Dashboard

### Recent sales

```http
GET /dashboard/recent-sales
```

**Response (200):** Up to 5 rows: `id`, `total_amount`, `created_at`, `customer_name`.

### Top customers

```http
GET /dashboard/top-customers
```

**Response (200):** Up to 5 rows: `customer_name`, `total` (sum of sales).

### Today’s revenue

```http
GET /dashboard/today-revenue
```

**Response (200):**

```json
{ "todayRevenue": 0 }
```

Uses `CURDATE()` on server timezone.

### Weekly sales

```http
GET /dashboard/weekly-sales
```

**Response (200):**

```json
[
  { "day": "Monday", "total": 12000 }
]
```

Last 7 days, grouped by weekday name.

---

## Error responses

| Status | Typical cause |
|--------|----------------|
| 400 | Validation (missing customer, invalid payment amount) |
| 401 | Invalid JWT |
| 403 | Missing Authorization header |
| 404 | Customer not found (pay endpoint) |
| 500 | DB/SQL errors — body `{ message: "..." }` or driver error object |

---

## Postman quick setup

1. `POST {{baseUrl}}/login` → save `token` from response.
2. Collection variable `token` → Authorization type **Bearer Token**.
3. `baseUrl` = `https://thumbs-backend.onrender.com`

---

## Endpoint summary

| Method | Path | Auth |
|--------|------|------|
| POST | `/login` | No |
| GET | `/products` | Yes |
| GET | `/products/search/:key` | Yes |
| GET | `/products/stats` | Yes |
| POST | `/products` | Yes |
| PUT | `/products/:id` | Yes |
| DELETE | `/products/:id` | Yes |
| GET | `/inventory` | Yes |
| GET | `/customers` | Yes |
| POST | `/customers` | Yes |
| PUT | `/customers/:id` | Yes |
| DELETE | `/customers/:id` | Yes |
| POST | `/customers/:id/pay` | Yes |
| GET | `/sales` | Yes |
| POST | `/sales` | Yes |
| DELETE | `/sales/:id` | Yes |
| GET | `/deliveries` | Yes |
| POST | `/deliveries` | Yes |
| DELETE | `/deliveries/:id` | Yes |
| GET | `/dashboard/recent-sales` | Yes |
| GET | `/dashboard/top-customers` | Yes |
| GET | `/dashboard/today-revenue` | Yes |
| GET | `/dashboard/weekly-sales` | Yes |
