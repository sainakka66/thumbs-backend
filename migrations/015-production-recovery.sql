-- =============================================================================
-- ThumbsUpApp — Production recovery (audit P0/P1 fixes)
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- payment_domain_audit_logs — unified payment platform audit (avoids collision
-- with business audit_logs from migration 004)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_domain_audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `audit_uuid` CHAR(36) NOT NULL,
  `domain` VARCHAR(32) NOT NULL DEFAULT 'payments',
  `entity_type` VARCHAR(32) NOT NULL,
  `entity_id` BIGINT UNSIGNED NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `actor_user_id` INT NULL,
  `old_state` JSON NULL,
  `new_state` JSON NULL,
  `correlation_id` CHAR(36) NULL,
  `ip_address` VARCHAR(45) NULL,
  `metadata` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_domain_audit_uuid` (`audit_uuid`),
  KEY `idx_payment_domain_audit_entity` (`entity_type`, `entity_id`),
  KEY `idx_payment_domain_audit_action` (`action`),
  KEY `idx_payment_domain_audit_correlation` (`correlation_id`),
  KEY `idx_payment_domain_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Collections ↔ payments link (idempotent settlement collection records)
-- -----------------------------------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collections' AND COLUMN_NAME = 'payment_order_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE `collections` ADD COLUMN `payment_order_id` BIGINT UNSIGNED NULL AFTER `customer_id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'collections' AND INDEX_NAME = 'uk_collections_payment_order'
);
SET @sql := IF(
  @idx_exists = 0,
  'CREATE UNIQUE INDEX `uk_collections_payment_order` ON `collections` (`payment_order_id`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- -----------------------------------------------------------------------------
-- P0-3: Field roles can create and view own payments
-- -----------------------------------------------------------------------------
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN ('payments.create', 'payments.view.self')
WHERE r.slug IN ('SALESPERSON', 'MANAGER');

-- MANAGER: collections for payment reconciliation visibility
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN ('collections.view')
WHERE r.slug = 'SALESPERSON';
