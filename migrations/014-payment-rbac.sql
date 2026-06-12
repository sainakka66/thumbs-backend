-- =============================================================================
-- ThumbsUpApp — Phase 12: Payment platform RBAC extension
-- Extends existing roles/permissions/role_permissions (no replacement)
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- New payment-platform roles
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `roles` (`slug`, `name`, `description`, `is_system`) VALUES
  ('MERCHANT', 'Merchant', 'Merchant portal — own payments and settlements', 1),
  ('SUPPORT', 'Support', 'Customer support — view payments, notifications, audit', 1),
  ('FINANCE', 'Finance', 'Finance ops — ledger, settlement, reconciliation', 1),
  ('SUPER_ADMIN', 'Super Administrator', 'Full override — all payment platform operations', 1);

-- -----------------------------------------------------------------------------
-- Payment platform permissions
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `permissions` (`slug`, `module`, `action`, `description`) VALUES
  ('payments.create', 'payments', 'create', 'Create and verify payment orders'),
  ('payments.view.self', 'payments', 'view_self', 'View own payment orders'),
  ('payments.view.all', 'payments', 'view_all', 'View all payment orders'),
  ('payments.capture', 'payments', 'capture', 'Capture authorized payments'),
  ('payments.refund.create', 'payments', 'refund_create', 'Initiate refund request'),
  ('payments.refund.approve', 'payments', 'refund_approve', 'Approve refund requests'),
  ('payments.refund.execute', 'payments', 'refund_execute', 'Execute refunds against provider'),
  ('payments.refunds.view', 'payments', 'refunds_view', 'View refund records'),
  ('ledger.view', 'ledger', 'view', 'View ledger entries'),
  ('ledger.post', 'ledger', 'post', 'Post ledger journal entries'),
  ('ledger.reverse', 'ledger', 'reverse', 'Reverse ledger entries'),
  ('settlement.view', 'settlement', 'view', 'View settlement status'),
  ('settlement.execute', 'settlement', 'execute', 'Execute settlement for captured orders'),
  ('reconciliation.view', 'reconciliation', 'view', 'View reconciliation runs and results'),
  ('reconciliation.run', 'reconciliation', 'run', 'Trigger reconciliation jobs'),
  ('webhook.view', 'webhook', 'view', 'View webhook events'),
  ('webhook.replay', 'webhook', 'replay', 'Replay webhook events'),
  ('notifications.view', 'notifications', 'view', 'View payment notification queue'),
  ('notifications.retry', 'notifications', 'retry', 'Retry failed payment notifications'),
  ('admin.override', 'admin', 'override', 'Emergency override for settlement and reconciliation');

-- -----------------------------------------------------------------------------
-- CUSTOMER: payments.create + payments.view.self
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN ('payments.create', 'payments.view.self', 'portal.view')
WHERE r.slug = 'CUSTOMER';

-- -----------------------------------------------------------------------------
-- MERCHANT
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN ('payments.view.self', 'payments.refunds.view', 'settlement.view')
WHERE r.slug = 'MERCHANT';

-- -----------------------------------------------------------------------------
-- SUPPORT
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN (
  'payments.view.all', 'payments.refunds.view', 'notifications.view',
  'notifications.retry', 'audit.view'
) WHERE r.slug = 'SUPPORT';

-- -----------------------------------------------------------------------------
-- FINANCE
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN (
  'payments.view.all', 'payments.refunds.view', 'ledger.view',
  'settlement.view', 'settlement.execute', 'reconciliation.view', 'reconciliation.run'
) WHERE r.slug = 'FINANCE';

-- -----------------------------------------------------------------------------
-- ADMIN: all payment-platform permissions + existing business perms (additive)
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.module IN (
  'payments', 'ledger', 'settlement', 'reconciliation', 'webhook', 'notifications', 'admin'
) OR p.slug = 'audit.view'
WHERE r.slug = 'ADMIN';

-- -----------------------------------------------------------------------------
-- SUPER_ADMIN: everything + admin.override
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
CROSS JOIN `permissions` p
WHERE r.slug = 'SUPER_ADMIN';
