-- =============================================================================
-- ThumbsUpApp — Enterprise roles (DELIVERY, CUSTOMER), user mgmt permissions
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

INSERT IGNORE INTO `roles` (`slug`, `name`, `description`, `is_system`) VALUES
  ('DELIVERY', 'Delivery', 'Delivery operations', 1),
  ('CUSTOMER', 'Customer', 'Customer portal access', 1);

INSERT IGNORE INTO `permissions` (`slug`, `module`, `action`, `description`) VALUES
  ('portal.view', 'portal', 'view', 'Customer portal access'),
  ('users.manage', 'users', 'manage', 'Manage users and roles');

-- DELIVERY: same as legacy DELIVERY_AGENT
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN (
  'dashboard.view','deliveries.view_own','deliveries.update','notifications.view'
) WHERE r.slug = 'DELIVERY';

-- CUSTOMER: portal only
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN ('portal.view')
WHERE r.slug = 'CUSTOMER';

-- MANAGER: align with spec (no payments admin)
DELETE rp FROM `role_permissions` rp
JOIN `roles` r ON r.id = rp.role_id
JOIN `permissions` p ON p.id = rp.permission_id
WHERE r.slug = 'MANAGER' AND p.slug IN ('payments.view', 'audit.view', 'users.manage');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN (
  'dashboard.view','inventory.view','inventory.create','inventory.update',
  'customers.view','customers.create','customers.update',
  'sales.view','sales.create','reports.view','reports.export','notifications.view'
) WHERE r.slug = 'MANAGER';

-- SALESPERSON: dashboard, sales, customers, notifications
DELETE rp FROM `role_permissions` rp
JOIN `roles` r ON r.id = rp.role_id
JOIN `permissions` p ON p.id = rp.permission_id
WHERE r.slug = 'SALESPERSON' AND p.slug NOT IN (
  'dashboard.view','customers.view','customers.create','customers.update',
  'sales.view','sales.create','notifications.view','inventory.view','payments.view'
);

-- Map DELIVERY_AGENT users to DELIVERY role_id where DELIVERY exists
UPDATE `users` u
JOIN `roles` r ON r.slug = 'DELIVERY'
SET u.role_id = r.id
WHERE u.role_id IN (SELECT id FROM `roles` WHERE slug = 'DELIVERY_AGENT');
