# ThumbsUpApp — API Documentation (Phase 2)

Base URL: production Render backend; development via Vite proxy `/api`.

Authentication: `Authorization: Bearer <JWT>` on all protected routes.

---

## Authentication

| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | Returns `{ success, token, role, permissions[] }` |
| POST | `/logout` | Stateless logout; writes audit `logout` |

---

## RBAC

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/rbac/me` | `dashboard.view` | Current user role and permission slugs |

### Roles

- `ADMIN` — full access
- `MANAGER` — customers, inventory, sales, deliveries, reports
- `SALESPERSON` — customers, sales, view inventory
- `DELIVERY_AGENT` — assigned deliveries only (`deliveries.view_own`)

Legacy JWT roles (`admin`, `user`, `distributor`) map to enterprise slugs automatically.

---

## Executive dashboard

| Method | Path | Permission |
|--------|------|------------|
| GET | `/dashboard/executive` | `dashboard.view` |

Response includes: today/weekly/monthly sales, revenue, top products, low stock, delivery counts, customer totals, chart series.

Legacy routes remain: `/dashboard/recent-sales`, `/dashboard/top-customers`, `/dashboard/today-revenue`, `/dashboard/weekly-sales`.

---

## Audit

| Method | Path | Permission | Query params |
|--------|------|------------|--------------|
| GET | `/audit/logs` | `audit.view` | `userId`, `action`, `entityType`, `from`, `to`, `limit`, `offset` |

---

## Notifications

| Method | Path | Permission |
|--------|------|------------|
| GET | `/notifications` | `notifications.view` |
| PATCH | `/notifications/:id/read` | `notifications.view` |
| POST | `/notifications/read-all` | `notifications.view` |

Query: `?unread=1` for unread only.

---

## Stock alerts

| Method | Path | Permission |
|--------|------|------------|
| GET | `/stock-alerts` | `inventory.view` |
| POST | `/stock-alerts/sync` | `inventory.update` |

---

## Global search

| Method | Path | Permission |
|--------|------|------------|
| GET | `/search?q=` | `dashboard.view` |

Searches customers, inventory, sales, deliveries (scoped by role).

---

## Reports

| Method | Path | Permission | Query |
|--------|------|------------|-------|
| GET | `/reports/:type` | `reports.view` | `type`: sales \| inventory \| customers \| deliveries |

Query: `range=today|week|month|custom`, `from`, `to`, `format=json|csv|excel`.

---

## PDF exports

| Method | Path | Permission |
|--------|------|------------|
| GET | `/pdf/sales-invoice/:id` | `sales.view` |
| GET | `/pdf/delivery-challan/:id` | `deliveries.view` |
| GET | `/pdf/inventory-report` | `reports.export` |
| GET | `/pdf/customer-statement/:id` | `customers.view` |

Returns `application/pdf` stream.

---

## Deliveries (enhanced)

| Method | Path | Permission |
|--------|------|------------|
| PUT | `/deliveries/:id` | `deliveries.update` |

Body: `{ status, notes, driver_name, vehicle_no }`. Delivery agents may only update assigned rows.

---

## Core modules (RBAC enforced)

Existing routes now require permissions:

- Products/inventory → `inventory.*`
- Customers → `customers.*`
- Sales → `sales.*`
- Deliveries → `deliveries.view` or `deliveries.view_own`

---

## Payments & admin (unchanged paths)

See `PAYMENTS_DEPLOYMENT.md`. Admin routes accept role `ADMIN` or legacy `admin`.

---

## Migration

```bash
npm run migrate:business
```

Applies `migrations/004-enterprise-business.sql`.
