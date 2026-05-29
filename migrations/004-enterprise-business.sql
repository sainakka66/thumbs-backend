-- =============================================================================
-- ThumbsUpApp — Enterprise business management (run after 003)
-- RBAC, audit, notifications, stock alerts
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -----------------------------------------------------------------------------
-- roles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(32) NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `description` VARCHAR(255) NULL,
  `is_system` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- permissions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(64) NOT NULL,
  `module` VARCHAR(32) NOT NULL,
  `action` VARCHAR(32) NOT NULL,
  `description` VARCHAR(255) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permissions_slug` (`slug`),
  KEY `idx_permissions_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- role_permissions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `role_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  KEY `idx_role_permissions_perm` (`permission_id`),
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- audit_logs (business operations — separate from payment_audit_logs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NULL,
  `username` VARCHAR(100) NULL,
  `action` VARCHAR(64) NOT NULL,
  `entity_type` VARCHAR(32) NOT NULL,
  `entity_id` VARCHAR(64) NULL,
  `before_value` JSON NULL,
  `after_value` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `device_fingerprint` VARCHAR(128) NULL,
  `user_agent` VARCHAR(512) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_user` (`user_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_entity` (`entity_type`, `entity_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NULL COMMENT 'NULL = broadcast to all with permission',
  `type` VARCHAR(32) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NULL,
  `entity_type` VARCHAR(32) NULL,
  `entity_id` VARCHAR(64) NULL,
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `read_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notifications_user_read` (`user_id`, `is_read`),
  KEY `idx_notifications_created` (`created_at`),
  KEY `idx_notifications_type` (`type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- stock_alerts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `stock_alerts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `inventory_id` INT NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `current_stock` DECIMAL(12,2) NOT NULL,
  `threshold` DECIMAL(12,2) NOT NULL,
  `status` ENUM('active','resolved','dismissed') NOT NULL DEFAULT 'active',
  `alert_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_stock_alerts_inventory` (`inventory_id`),
  KEY `idx_stock_alerts_status` (`status`),
  KEY `idx_stock_alerts_date` (`alert_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- deliveries: assign agent for DELIVERY_AGENT role
-- -----------------------------------------------------------------------------
ALTER TABLE `deliveries`
  ADD COLUMN `assigned_user_id` INT NULL AFTER `customer_id`;

-- users.role_id link (optional; falls back to users.role string)
ALTER TABLE `users`
  ADD COLUMN `role_id` INT NULL AFTER `role`;

-- Seed roles
INSERT IGNORE INTO `roles` (`slug`, `name`, `description`, `is_system`) VALUES
  ('ADMIN', 'Administrator', 'Full system access', 1),
  ('MANAGER', 'Manager', 'Operations and reports', 1),
  ('SALESPERSON', 'Salesperson', 'Customers and sales', 1),
  ('DELIVERY_AGENT', 'Delivery Agent', 'Assigned deliveries only', 1);

-- Seed permissions
INSERT IGNORE INTO `permissions` (`slug`, `module`, `action`, `description`) VALUES
  ('dashboard.view', 'dashboard', 'view', 'View executive dashboard'),
  ('inventory.view', 'inventory', 'view', 'View inventory'),
  ('inventory.create', 'inventory', 'create', 'Add products'),
  ('inventory.update', 'inventory', 'update', 'Update stock and products'),
  ('inventory.delete', 'inventory', 'delete', 'Delete products'),
  ('customers.view', 'customers', 'view', 'View customers'),
  ('customers.create', 'customers', 'create', 'Create customers'),
  ('customers.update', 'customers', 'update', 'Update customers'),
  ('customers.delete', 'customers', 'delete', 'Delete customers'),
  ('sales.view', 'sales', 'view', 'View sales'),
  ('sales.create', 'sales', 'create', 'Record sales'),
  ('sales.delete', 'sales', 'delete', 'Delete sales'),
  ('deliveries.view', 'deliveries', 'view', 'View deliveries'),
  ('deliveries.view_own', 'deliveries', 'view_own', 'View assigned deliveries only'),
  ('deliveries.create', 'deliveries', 'create', 'Schedule deliveries'),
  ('deliveries.update', 'deliveries', 'update', 'Update delivery status'),
  ('deliveries.delete', 'deliveries', 'delete', 'Delete deliveries'),
  ('reports.view', 'reports', 'view', 'View reports'),
  ('reports.export', 'reports', 'export', 'Export PDF/CSV'),
  ('audit.view', 'audit', 'view', 'View audit trail'),
  ('notifications.view', 'notifications', 'view', 'View notifications'),
  ('users.manage', 'users', 'manage', 'Manage users and roles'),
  ('payments.view', 'payments', 'view', 'View UPI payments');

-- ADMIN: all permissions
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r CROSS JOIN `permissions` p WHERE r.slug = 'ADMIN';

-- MANAGER
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN (
  'dashboard.view','inventory.view','inventory.create','inventory.update','inventory.delete',
  'customers.view','customers.create','customers.update','customers.delete',
  'sales.view','sales.create','sales.delete',
  'deliveries.view','deliveries.create','deliveries.update','deliveries.delete',
  'reports.view','reports.export','notifications.view','payments.view'
) WHERE r.slug = 'MANAGER';

-- SALESPERSON
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN (
  'dashboard.view','inventory.view','customers.view','customers.create','customers.update',
  'sales.view','sales.create','notifications.view','payments.view'
) WHERE r.slug = 'SALESPERSON';

-- DELIVERY_AGENT
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN (
  'dashboard.view','deliveries.view_own','deliveries.update','notifications.view'
) WHERE r.slug = 'DELIVERY_AGENT';

-- Map legacy users.role to role_id
UPDATE `users` u
JOIN `roles` r ON (
  (LOWER(u.role) = 'admin' AND r.slug = 'ADMIN') OR
  (LOWER(u.role) IN ('distributor','manager') AND r.slug = 'MANAGER') OR
  (LOWER(u.role) IN ('user','salesperson','sales') AND r.slug = 'SALESPERSON') OR
  (LOWER(u.role) IN ('delivery','delivery_agent') AND r.slug = 'DELIVERY_AGENT') OR
  (UPPER(u.role) = r.slug)
)
SET u.role_id = r.id
WHERE u.role_id IS NULL;
