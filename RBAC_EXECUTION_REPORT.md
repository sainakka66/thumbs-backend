# RBAC Execution Report

Generated: 2026-05-29T17:53:27.919Z

Route probes performed by direct navigation after login per role.

| Role | Route | Screen | Result | Final URL |
| --- | --- | --- | --- | --- |
| ADMIN | /dashboard | Dashboard | Allowed | /dashboard |
| ADMIN | /customers | Customers | Allowed | /customers |
| ADMIN | /inventory | Inventory | Allowed | /inventory |
| ADMIN | /sales | Sales | Allowed | /sales |
| ADMIN | /deliveries | Deliveries | Allowed | /deliveries |
| ADMIN | /reports | Reports | Allowed | /reports |
| ADMIN | /notifications | Notifications | Allowed | /notifications |
| ADMIN | /admin/audit | Audit Logs | Allowed | /admin/audit |
| ADMIN | /admin/payments | Admin Payments | Allowed | /admin/payments |
| ADMIN | /payments | UPI Payments | Allowed | /payments |
| MANAGER | /dashboard | Dashboard | Allowed | /dashboard |
| MANAGER | /customers | Customers | Allowed | /customers |
| MANAGER | /inventory | Inventory | Allowed | /inventory |
| MANAGER | /sales | Sales | Allowed | /sales |
| MANAGER | /deliveries | Deliveries | Allowed | /deliveries |
| MANAGER | /reports | Reports | Allowed | /reports |
| MANAGER | /notifications | Notifications | Allowed | /notifications |
| MANAGER | /admin/audit | Audit Logs | Denied | /dashboard |
| MANAGER | /admin/payments | Admin Payments | Denied | /dashboard |
| MANAGER | /payments | UPI Payments | Allowed | /payments |
| SALESPERSON | /dashboard | Dashboard | Allowed | /dashboard |
| SALESPERSON | /customers | Customers | Allowed | /customers |
| SALESPERSON | /inventory | Inventory | Allowed | /inventory |
| SALESPERSON | /sales | Sales | Allowed | /sales |
| SALESPERSON | /deliveries | Deliveries | Allowed | /deliveries |
| SALESPERSON | /reports | Reports | Allowed | /dashboard |
| SALESPERSON | /notifications | Notifications | Allowed | /notifications |
| SALESPERSON | /admin/audit | Audit Logs | Denied | /dashboard |
| SALESPERSON | /admin/payments | Admin Payments | Denied | /dashboard |
| SALESPERSON | /payments | UPI Payments | Allowed | /payments |
| DELIVERY_AGENT | /dashboard | Dashboard | Allowed | /dashboard |
| DELIVERY_AGENT | /customers | Customers | Allowed | /customers |
| DELIVERY_AGENT | /inventory | Inventory | Allowed | /inventory |
| DELIVERY_AGENT | /sales | Sales | Allowed | /sales |
| DELIVERY_AGENT | /deliveries | Deliveries | Allowed | /deliveries |
| DELIVERY_AGENT | /reports | Reports | Allowed | /dashboard |
| DELIVERY_AGENT | /notifications | Notifications | Allowed | /notifications |
| DELIVERY_AGENT | /admin/audit | Audit Logs | Denied | /dashboard |
| DELIVERY_AGENT | /admin/payments | Admin Payments | Denied | /dashboard |
| DELIVERY_AGENT | /payments | UPI Payments | Allowed | /payments |

## Expected matrix (reference)

| Route | ADMIN | MANAGER | SALESPERSON | DELIVERY_AGENT |
| --- | --- | --- | --- | --- |
| /dashboard | Allowed | Allowed | Allowed | Allowed |
| /customers | Allowed | Allowed | Allowed | Denied* |
| /inventory | Allowed | Allowed | Allowed | Denied |
| /sales | Allowed | Allowed | Allowed | Denied |
| /deliveries | Allowed | Allowed | Denied** | Own only |
| /reports | Allowed | Allowed | Denied | Denied |
| /admin/audit | Allowed | Denied | Denied | Denied |

*Delivery agent has no customers.view permission.
**Salesperson lacks deliveries.view.
