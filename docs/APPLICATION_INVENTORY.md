# ThumbsUp Application Inventory

Complete inventory for Phase 2.5 verification. Generated for operational visibility — not a marketing doc.

**Legend:** ✅ Implemented · ⚠️ Partial · 🔲 Schema only / no API

---

## 1. API Endpoints

### Public / Auth

| Feature | Status | Method | Path | Auth | Permission |
|---------|--------|--------|------|------|------------|
| Health check | ✅ | GET | `/health` | None | — |
| Login | ✅ | POST | `/login` | None | — |
| Logout | ✅ | POST | `/logout` | JWT | — |

### Inventory / Products

| Feature | Status | Method | Path | Permission |
|---------|--------|--------|------|------------|
| List products (paged) | ✅ | GET | `/products` | `inventory.view` |
| Search products | ✅ | GET | `/products/search/:key` | `inventory.view` |
| Create product | ✅ | POST | `/products` | `inventory.create` |
| Update product | ✅ | PUT | `/products/:id` | `inventory.update` |
| Delete product | ✅ | DELETE | `/products/:id` | `inventory.delete` |
| Product stats | ✅ | GET | `/products/stats` | `inventory.view` |
| Full inventory list | ✅ | GET | `/inventory` | `inventory.view` |

### Customers

| Feature | Status | Method | Path | Permission |
|---------|--------|--------|------|------------|
| List customers | ✅ | GET | `/customers` | `customers.view` |
| Create customer | ✅ | POST | `/customers` | `customers.create` |
| Update customer | ✅ | PUT | `/customers/:id` | `customers.update` |
| Delete customer | ✅ | DELETE | `/customers/:id` | `customers.delete` |
| Record payment | ✅ | POST | `/customers/:id/pay` | `customers.update` |

### Sales

| Feature | Status | Method | Path | Permission |
|---------|--------|--------|------|------------|
| List sales | ✅ | GET | `/sales` | `sales.view` |
| Create sale | ✅ | POST | `/sales` | `sales.create` |
| Delete sale | ✅ | DELETE | `/sales/:id` | `sales.delete` |

### Deliveries

| Feature | Status | Method | Path | Permission |
|---------|--------|--------|------|------------|
| List deliveries | ✅ | GET | `/deliveries` | `deliveries.view` / `deliveries.view_own` |
| Create delivery | ✅ | POST | `/deliveries` | `deliveries.create` |
| Update delivery | ✅ | PUT | `/deliveries/:id` | `deliveries.update` |
| Delete delivery | ✅ | DELETE | `/deliveries/:id` | `deliveries.delete` |

### Dashboard (legacy + executive)

| Feature | Status | Method | Path | Permission |
|---------|--------|--------|------|------------|
| Recent sales | ✅ | GET | `/dashboard/recent-sales` | `dashboard.view` |
| Top customers | ✅ | GET | `/dashboard/top-customers` | `dashboard.view` |
| Today revenue | ✅ | GET | `/dashboard/today-revenue` | `dashboard.view` |
| Weekly sales | ✅ | GET | `/dashboard/weekly-sales` | `dashboard.view` |
| Executive dashboard | ✅ | GET | `/dashboard/executive` | `dashboard.view` |

### Phase 2 Business APIs

| Feature | Status | Method | Path | Permission |
|---------|--------|--------|------|------------|
| Global search | ✅ | GET | `/search?q=` | `dashboard.view` |
| Stock alerts | ✅ | GET | `/stock-alerts` | `inventory.view` |
| Sync stock alerts | ✅ | POST | `/stock-alerts/sync` | `inventory.update` |
| Notifications | ✅ | GET | `/notifications` | `notifications.view` |
| Mark notification read | ✅ | PATCH | `/notifications/:id/read` | `notifications.view` |
| Mark all read | ✅ | POST | `/notifications/read-all` | `notifications.view` |
| Audit logs | ✅ | GET | `/audit/logs` | `audit.view` |
| Reports | ✅ | GET | `/reports/:type` | `reports.view` |
| RBAC profile | ✅ | GET | `/rbac/me` | `dashboard.view` |
| Sales invoice PDF | ✅ | GET | `/pdf/sales-invoice/:id` | `sales.view` |
| Delivery challan PDF | ✅ | GET | `/pdf/delivery-challan/:id` | `deliveries.view` |
| Inventory report PDF | ✅ | GET | `/pdf/inventory-report` | `reports.export` |
| Customer statement PDF | ✅ | GET | `/pdf/customer-statement/:id` | `customers.view` |

### Payments / Risk / Admin

| Feature | Status | Method | Path | Permission |
|---------|--------|--------|------|------------|
| Create payment order | ✅ | POST | `/payments/create-order` | JWT + payments |
| Verify payment | ✅ | POST | `/payments/verify` | JWT |
| Payment status | ✅ | GET | `/payments/status/:id` | JWT |
| Payment history | ✅ | GET | `/payments/history` | JWT |
| Refund | ✅ | POST | `/payments/refund` | ADMIN |
| Webhook | ✅ | POST | `/payments/webhook` | HMAC signature |
| Risk analyze | ✅ | POST | `/risk/analyze` | JWT |
| Admin monitor | ✅ | GET | `/admin/payments/monitor` | ADMIN |
| Fraud queue | ✅ | GET | `/admin/payments/fraud-queue` | ADMIN |
| Webhook log | ✅ | GET | `/admin/payments/webhooks` | ADMIN |
| Refund request | ✅ | POST | `/admin/payments/refund/request` | ADMIN |
| Block user | ✅ | POST | `/admin/block-user` | ADMIN |
| Unblock user | ✅ | POST | `/admin/unblock-user` | ADMIN |
| Review suspicious | ✅ | POST | `/admin/payments/review/:id` | ADMIN |

### Not implemented (requested in RBAC seed only)

| Feature | Status | Notes |
|---------|--------|-------|
| User management API | 🔲 | `users.manage` permission exists; no CRUD routes |
| POST /auth/register | 🔲 | Login only at `/login` |
| GET /session/validate | 🔲 | Stateless JWT |

---

## 2. Frontend Routes

| Route | Page | Permission / Role |
|-------|------|-------------------|
| `/login` | LoginPage | Public |
| `/dashboard` | DashboardPage (executive) | `dashboard.view` |
| `/inventory` | InventoryPage | `inventory.view` |
| `/sales` | SalesPage | `sales.view` |
| `/deliveries` | DeliveriesPage | deliveries permissions |
| `/customers` | CustomersPage | `customers.view` |
| `/payments` | PaymentsPage | `payments.view` |
| `/reports` | ReportsPage | `reports.view` |
| `/notifications` | NotificationsPage | `notifications.view` |
| `/admin/payments` | AdminPaymentsPage | ADMIN |
| `/admin/fraud` | AdminFraudPage | ADMIN |
| `/admin/audit` | AuditPage | ADMIN + `audit.view` |

---

## 3. Database Tables

| Table | Migration | Purpose |
|-------|-----------|---------|
| `users` | pre-existing / 002 | Authentication |
| `inventory` | 001 | Products |
| `customers` | 001 | Shops |
| `sales` | 001 | Sales ledger |
| `deliveries` | 001 / 004 | Delivery tracking |
| `roles` | 004 | RBAC roles |
| `permissions` | 004 | RBAC permissions |
| `role_permissions` | 004 | Role ↔ permission |
| `audit_logs` | 004 | Business audit |
| `notifications` | 004 | Alert center |
| `stock_alerts` | 004 | Low stock |
| `payment_orders` | 002 | Payments |
| `payment_transactions` | 002 | Payment tx |
| `payment_webhooks` | 002 / 003 | Webhooks |
| `suspicious_activities` | 002 | Fraud queue |
| `blocked_entities` | 002 | Blocks |
| (+ 15 more payment/security tables) | 002 / 003 | Payments enterprise |

---

## 4. Roles & Permissions

### Roles

| Slug | Description |
|------|-------------|
| ADMIN | Full access |
| MANAGER | Operations + reports |
| SALESPERSON | Customers + sales + view inventory |
| DELIVERY_AGENT | Assigned deliveries only |

### Permission slugs (004 seed)

`dashboard.view`, `inventory.*`, `customers.*`, `sales.*`, `deliveries.*`, `reports.view`, `reports.export`, `audit.view`, `notifications.view`, `users.manage`, `payments.view`

---

## 5. Middleware

| Middleware | Scope | Purpose |
|------------|-------|---------|
| helmet | Global | Security headers |
| cors | Global | Origin allowlist |
| express.json | Global | Body parser |
| verifyToken + loadBusinessUser | Core + business | JWT + RBAC |
| enforce(permission) | Core routes | Permission gate |
| httpsEnforce, originGuard | Payments mount | HTTPS + CSRF-style |
| inputSanitizer | Payments | SQLi sanitization |
| requireRole / adminGuard | Admin payments | ADMIN only |
| enterpriseLimiter | Login, payments | Rate limits |

---

## 6. Services (backend)

| Service | Path |
|---------|------|
| dashboardService | `business/services/dashboardService.js` |
| searchService | `business/services/searchService.js` |
| reportService | `business/services/reportService.js` |
| notificationService | `business/services/notificationService.js` |
| stockAlertService | `business/services/stockAlertService.js` |
| pdfService | `business/services/pdfService.js` |
| auditService | `lib/audit/auditService.js` |
| paymentService | `payments/services/paymentService.js` |
| riskEngineV2 | `payments/fraud/riskEngineV2.js` |
| deviceTrustService | `payments/services/deviceTrustService.js` |

---

## 7. Feature inventory

| Feature Name | Status | API Used | Tables Used | Dependencies |
|--------------|--------|----------|-------------|--------------|
| Login / JWT | ✅ | POST `/login` | `users` | bcrypt, JWT_SECRET |
| RBAC enforcement | ✅ | All protected routes | `roles`, `permissions` | migrate:business |
| Executive dashboard | ✅ | GET `/dashboard/executive` | `sales`, `inventory`, `deliveries`, `customers` | — |
| Low stock alerts | ✅ | GET/POST `/stock-alerts` | `stock_alerts`, `inventory` | notificationService |
| Notifications | ✅ | GET `/notifications` | `notifications` | — |
| Audit trail | ✅ | auto on mutations | `audit_logs` | auditService |
| Sales invoice PDF | ✅ | GET `/pdf/sales-invoice/:id` | `sales`, `customers` | pdfkit |
| Delivery challan PDF | ✅ | GET `/pdf/delivery-challan/:id` | `deliveries` | pdfkit |
| Global search | ✅ | GET `/search` | customers, inventory, sales, deliveries | — |
| Reports CSV | ✅ | GET `/reports/sales?format=csv` | `sales` | — |
| UPI payments | ✅ | `/payments/*` | payment_* tables | Razorpay env |
| Admin fraud queue | ✅ | GET `/admin/payments/fraud-queue` | `suspicious_activities` | ADMIN role |
| User management | 🔲 | — | `users` | users.manage unused |
| PWA | ✅ | — | — | Vite PWA plugin |

---

## 8. Dashboard widgets (`/dashboard/executive`)

| Widget | Data source |
|--------|-------------|
| Today's sales | `sales` CURDATE |
| Weekly / monthly revenue | `sales` aggregates |
| Top products | `sales` 30d GROUP BY product |
| Low stock list | `inventory` quantity ≤ reorder |
| Pending / completed deliveries | `deliveries` status |
| Customer totals | `customers` |
| Sales trend chart | 14-day `sales` |
| Revenue trend chart | Same series |
| Product performance | Top products |
| Delivery performance | `deliveries` by date |

---

## 9. Audit events (implemented)

`login`, `logout`, `inventory_create`, `inventory_update`, `customer_create`, `customer_update`, `sale_create`, `delivery_create`, `delivery_updated`, `delivery_completed`

---

## 10. Notification types (generated in code)

`low_stock`, `customer_added`, `large_sale`, `delivery_completed`

---

## Local run

```bash
npm run migrate:business    # if not done
npm start                   # API
cd frontend && npm run dev  # UI
```
