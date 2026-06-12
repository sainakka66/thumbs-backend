-- Rollback Phase 12 payment RBAC (manual)
SET NAMES utf8mb4;

DELETE rp FROM `role_permissions` rp
JOIN `roles` r ON r.id = rp.role_id
JOIN `permissions` p ON p.id = rp.permission_id
WHERE r.slug IN ('MERCHANT', 'SUPPORT', 'FINANCE', 'SUPER_ADMIN')
   OR p.module IN ('payments', 'ledger', 'settlement', 'reconciliation', 'webhook')
   OR p.slug IN ('notifications.retry', 'admin.override', 'payments.refunds.view');

DELETE FROM `permissions`
WHERE slug IN (
  'payments.create', 'payments.view.self', 'payments.view.all', 'payments.capture',
  'payments.refund.create', 'payments.refund.approve', 'payments.refund.execute',
  'payments.refunds.view', 'ledger.view', 'ledger.post', 'ledger.reverse',
  'settlement.view', 'settlement.execute', 'reconciliation.view', 'reconciliation.run',
  'webhook.view', 'webhook.replay', 'notifications.retry', 'admin.override'
);

DELETE FROM `roles` WHERE slug IN ('MERCHANT', 'SUPPORT', 'FINANCE', 'SUPER_ADMIN');
