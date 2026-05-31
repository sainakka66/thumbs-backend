-- Phase 2 — Collections, UPI QR, reconciliation, notification feature flags

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `collections` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `customer_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_method` ENUM('cash','upi','bank_transfer','cheque') NOT NULL,
  `reference_no` VARCHAR(128) NULL,
  `collected_by` INT NULL,
  `collected_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` VARCHAR(512) NULL,
  `reconciled` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_collections_customer` (`customer_id`, `collected_at`),
  KEY `idx_collections_method` (`payment_method`),
  CONSTRAINT `fk_collections_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_collections_collector` FOREIGN KEY (`collected_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_reconciliations` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `collection_id` BIGINT UNSIGNED NULL,
  `sale_id` INT NULL,
  `customer_id` INT NOT NULL,
  `matched_amount` DECIMAL(12,2) NOT NULL,
  `status` ENUM('pending','matched','partial','void') NOT NULL DEFAULT 'pending',
  `notes` VARCHAR(512) NULL,
  `created_by` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recon_customer` (`customer_id`),
  CONSTRAINT `fk_recon_collection` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `feature_flags` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `flag_key` VARCHAR(64) NOT NULL,
  `enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `config` JSON NULL,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_feature_flags_key` (`flag_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `feature_flags` (`flag_key`, `enabled`, `config`) VALUES
('notify_whatsapp', 0, '{"provider":"none"}'),
('notify_sms', 0, '{"provider":"none"}'),
('notify_email', 0, '{"provider":"none"}');

INSERT IGNORE INTO `permissions` (`slug`, `module`, `action`, `description`) VALUES
('collections.view', 'collections', 'view', 'View dues and collections'),
('collections.manage', 'collections', 'manage', 'Record collections and reconciliation');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN ('collections.view', 'collections.manage')
WHERE r.slug IN ('ADMIN', 'MANAGER');
