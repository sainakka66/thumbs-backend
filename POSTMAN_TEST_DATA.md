# Postman Test Data — Thumbs Up Distribution System

Realistic sample payloads matching the **actual** request bodies in the codebase. Copy into Postman request bodies, or use them to seed the database before testing.

> Seeded test users come from `scripts/seed-sai-users.js` (`npm run seed:enterprise`). Passwords are printed to the terminal on each run — copy them into the environment (`password`, `admin_pw`, etc.).

---

## Users (`scripts/seed-sai-users.js`)

| Username | Role | Use for env var |
|----------|------|-----------------|
| `admin_sai` | ADMIN | `admin_pw` |
| `manager_sai` | MANAGER | `manager_pw` |
| `sales_sai` | SALESPERSON | `sales_pw` |
| `delivery_sai` | DELIVERY | `delivery_pw` |
| `customer_sai` | CUSTOMER | `customer_pw` |

### Create a new user (`POST /users`)
```json
{
  "username": "test_user_pm",
  "password": "Str0ng!Passw0rd",
  "email": "test_user_pm@example.com",
  "phone": "9000000001",
  "roleSlug": "SALESPERSON"
}
```
`roleSlug` ∈ `ADMIN | MANAGER | SALESPERSON | DELIVERY | CUSTOMER`. Password must satisfy policy: ≥12 chars, upper, lower, number, special.

---

## Customers (`POST /customers`)
```json
{
  "shop_name": "Sri Sai Provisions",
  "owner_name": "Ramesh Kumar",
  "phone": "9876543210",
  "email": "srisai@example.com",
  "address": "12 Market Road, Hyderabad",
  "area": "Ameerpet",
  "credit_limit": 50000,
  "opening_balance": 0
}
```
More samples:
```json
[
  { "shop_name": "Lakshmi Stores", "owner_name": "Lakshmi Devi", "phone": "9812345678", "area": "Kukatpally", "credit_limit": 30000, "opening_balance": 0 },
  { "shop_name": "Anand General Store", "owner_name": "Anand Rao", "phone": "9701122334", "area": "Dilsukhnagar", "credit_limit": 40000, "opening_balance": 5000 }
]
```
**Record payment** (`POST /customers/:id/pay`): `{ "amount": 1000 }`

---

## Products / Inventory (`POST /products`)
```json
{
  "Name": "Thumbs Up 750ml",
  "quantity": 200,
  "price": 480,
  "sku": "TU-750",
  "category": "Cola",
  "size": "750ml",
  "bpc": 24,
  "reorder": 20
}
```
More samples (note capital `Name`):
```json
[
  { "Name": "Sprite 600ml", "quantity": 150, "price": 360, "sku": "SP-600", "category": "Lemon", "size": "600ml", "bpc": 24, "reorder": 15 },
  { "Name": "Maaza 1L", "quantity": 80, "price": 540, "sku": "MZ-1000", "category": "Other", "size": "1L", "bpc": 12, "reorder": 10 }
]
```

---

## Sales (`POST /sales`)
```json
{
  "customer_id": 1,
  "product_name": "Thumbs Up 750ml",
  "quantity": 5,
  "price_per_case": 500,
  "total_amount": 2500,
  "amount_paid": 2000,
  "payment_mode": "cash",
  "notes": "Postman test sale"
}
```
- `payment_mode` examples: `cash`, `upi`, `credit`.
- Selling reduces inventory by matching product `Name`; partial payment increases customer `outstanding_balance`.
- A `total_amount >= 50000` triggers a `large_sale` notification.

---

## Deliveries (`POST /deliveries`)
```json
{
  "customer_id": 1,
  "product_name": "Thumbs Up 750ml",
  "quantity": 5,
  "delivery_date": "2026-06-01",
  "driver_name": "Suresh",
  "vehicle_no": "TS09AB1234",
  "status": "Pending",
  "notes": "Morning route"
}
```
- `status`: `Pending | Scheduled | Completed | Delivered`.
- Update (`PUT /deliveries/:id`): `{ "status": "Completed", "notes": "Delivered" }` — a completed status fires a notification.
- DELIVERY-role users only see/update deliveries assigned to them (`assigned_user_id`).

---

## Payments (`POST /payments/create-order`)
```json
{
  "amount": 1500,
  "customerId": 1,
  "description": "Order settlement"
}
```
Verify (`POST /payments/verify`) — values come from Razorpay checkout, not seedable manually:
```json
{
  "orderUuid": "<uuid-from-create-order>",
  "razorpayOrderId": "order_XXXXXXXX",
  "razorpayPaymentId": "pay_XXXXXXXX",
  "razorpaySignature": "<hmac-signature>"
}
```
Risk analyze (`POST /risk/analyze`): `{ "amount": 1500, "customerId": 1 }`

---

## Suggested seeding order
1. Login as `admin_sai` → token captured.
2. Create 2–3 **customers** → note `customerId`.
3. Create 2–3 **products** → note `inventoryId`.
4. Create **sales** referencing a `customerId` and a product `Name`.
5. Create **deliveries** referencing a `customerId`.
6. `POST /stock-alerts/sync` to generate low-stock notifications.
7. `GET /notifications` → note `notificationId`.

The collection's test scripts auto-capture `customerId`, `inventoryId`, `saleId`, `deliveryId`, `notificationId`, and `userId` into the active environment as you run List/Create requests.
