# Audit Log Architecture

## Purpose

Immutable-style append-only log of business operations for compliance, dispute resolution, and admin investigation. Separate from `payment_audit_logs` (payments domain).

## Table: `audit_logs`

| Column | Description |
|--------|-------------|
| user_id, username | Actor |
| action | e.g. `login`, `sale_create`, `customer_update` |
| entity_type, entity_id | Target resource |
| before_value, after_value | JSON snapshots |
| ip_address, device_fingerprint, user_agent | Request context |
| created_at | Timestamp |

Indexes: user, action, entity, created_at.

## Backend flow

```
Handler completes successfully
  → writeAudit(req, { action, entityType, entityId, beforeValue, afterValue })
  → INSERT audit_logs
```

Service: `lib/audit/auditService.js`

Integrated actions:

- login / logout
- inventory create/update
- customer create/update
- sale create
- delivery create / update / complete

## Admin UI

- Route: `/admin/audit` (role `ADMIN`, permission `audit.view`)
- API: `GET /audit/logs?action=&from=&to=&userId=`
- Frontend: `frontend/src/pages/admin/AuditPage.jsx`

## Security

- Read requires `audit.view` (ADMIN only in seed data)
- Writes are server-side only; no public insert API
- Failed writes log warning; do not block primary operation

## Frontend flow

```
AuditPage → businessService.fetchAuditLogs(filters)
         → table render with search by action/date
```
