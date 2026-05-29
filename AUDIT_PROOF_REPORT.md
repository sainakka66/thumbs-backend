# Audit Proof Report

Generated: 2026-05-29T17:53:27.920Z

## Recent audit_logs rows (database)

| ID | User | Action | Entity | Entity ID | Created |
| --- | --- | --- | --- | --- | --- |
| 226 | delivery_test | logout | user | 4 | Fri May 29 2026 23:23:26 GMT+0530 (India Standard Time) |
| 225 | delivery_test | login | user | 4 | Fri May 29 2026 23:23:02 GMT+0530 (India Standard Time) |
| 224 | sales_test | logout | user | 3 | Fri May 29 2026 23:22:59 GMT+0530 (India Standard Time) |
| 223 | sales_test | sale_create | sale | — | Fri May 29 2026 23:22:37 GMT+0530 (India Standard Time) |
| 222 | sales_test | customer_create | customer | 52 | Fri May 29 2026 23:22:33 GMT+0530 (India Standard Time) |
| 221 | sales_test | login | user | 3 | Fri May 29 2026 23:22:31 GMT+0530 (India Standard Time) |
| 220 | manager_test | logout | user | 2 | Fri May 29 2026 23:22:28 GMT+0530 (India Standard Time) |
| 219 | manager_test | login | user | 2 | Fri May 29 2026 23:22:06 GMT+0530 (India Standard Time) |
| 218 | admin_test | logout | user | 1 | Fri May 29 2026 23:22:02 GMT+0530 (India Standard Time) |
| 217 | admin_test | delivery_create | delivery | 52 | Fri May 29 2026 23:21:37 GMT+0530 (India Standard Time) |
| 216 | delivery_test | login | user | 4 | Fri May 29 2026 23:21:37 GMT+0530 (India Standard Time) |
| 215 | admin_test | delivery_create | delivery | 51 | Fri May 29 2026 23:21:35 GMT+0530 (India Standard Time) |
| 214 | admin_test | sale_create | sale | — | Fri May 29 2026 23:21:28 GMT+0530 (India Standard Time) |
| 213 | admin_test | inventory_create | inventory | 101 | Fri May 29 2026 23:21:22 GMT+0530 (India Standard Time) |
| 212 | admin_test | customer_create | customer | 51 | Fri May 29 2026 23:21:16 GMT+0530 (India Standard Time) |
| 211 | admin_test | login | user | 1 | Fri May 29 2026 23:21:12 GMT+0530 (India Standard Time) |
| 210 | admin_test | inventory_update | seed | 29 | Fri May 29 2026 23:20:58 GMT+0530 (India Standard Time) |
| 209 | admin_test | login | seed | 28 | Fri May 29 2026 23:20:58 GMT+0530 (India Standard Time) |
| 208 | admin_test | sale_create | seed | 27 | Fri May 29 2026 23:20:58 GMT+0530 (India Standard Time) |
| 207 | admin_test | sale_create | seed | 26 | Fri May 29 2026 23:20:58 GMT+0530 (India Standard Time) |
| 206 | admin_test | customer_create | seed | 25 | Fri May 29 2026 23:20:58 GMT+0530 (India Standard Time) |
| 205 | admin_test | login | seed | 24 | Fri May 29 2026 23:20:58 GMT+0530 (India Standard Time) |
| 204 | admin_test | login | seed | 23 | Fri May 29 2026 23:20:58 GMT+0530 (India Standard Time) |
| 203 | admin_test | login | seed | 22 | Fri May 29 2026 23:20:58 GMT+0530 (India Standard Time) |
| 202 | admin_test | customer_create | seed | 21 | Fri May 29 2026 23:20:58 GMT+0530 (India Standard Time) |

## Action counts

| Action | Count |
| --- | --- |
| login | 72 |
| customer_create | 58 |
| sale_create | 45 |
| inventory_update | 44 |
| logout | 4 |
| delivery_create | 2 |
| inventory_create | 1 |

## Browser-verified actions

- ✅ PASS **ADMIN login** — executed in browser
- ✅ PASS **ADMIN create customer** — PW Shop 1780077075293
- ❌ FAIL **ADMIN edit customer (API — no edit UI)** — status 500
- ✅ PASS **ADMIN delete customer** — executed in browser
- ✅ PASS **ADMIN create inventory** — executed in browser
- ✅ PASS **ADMIN create sale** — executed in browser
- ✅ PASS **ADMIN sales invoice PDF** — status 200
- ✅ PASS **ADMIN log delivery** — executed in browser
- ✅ PASS **ADMIN assign delivery (API)** — status 200
- ✅ PASS **ADMIN audit logs page** — executed in browser
- ✅ PASS **ADMIN logout** — executed in browser
- ✅ PASS **MANAGER login** — executed in browser
- ✅ PASS **MANAGER audit denied** — http://localhost:5173/dashboard
- ✅ PASS **SALESPERSON login** — executed in browser
- ✅ PASS **SALESPERSON create customer** — executed in browser
- ✅ PASS **SALESPERSON search products** — executed in browser
- ✅ PASS **SALESPERSON create sale** — executed in browser
- ✅ PASS **SALESPERSON invoice PDF** — 200
- ✅ PASS **SALESPERSON reports denied** — executed in browser
- ✅ PASS **SALESPERSON audit denied** — executed in browser
- ✅ PASS **DELIVERY_AGENT login** — executed in browser
- ✅ PASS **DELIVERY_AGENT view deliveries** — 1 rows
- ❌ FAIL **DELIVERY_AGENT sales denied** — executed in browser
- ✅ PASS **DELIVERY_AGENT reports denied** — executed in browser
- ✅ PASS **DELIVERY_AGENT admin denied** — executed in browser
