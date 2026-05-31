-- Phase 4 — Supplier management & distributor operations

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `suppliers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(255) NULL,
  `gstin` VARCHAR(20) NULL,
  `address` TEXT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_suppliers_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `purchase_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `supplier_id` INT NOT NULL,
  `po_number` VARCHAR(64) NOT NULL,
  `status` ENUM('draft','ordered','partial','received','cancelled') NOT NULL DEFAULT 'draft',
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0,
  `expected_date` DATE NULL,
  `created_by` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_po_number` (`po_number`),
  KEY `idx_po_supplier` (`supplier_id`),
  CONSTRAINT `fk_po_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `stock_inward` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `purchase_order_id` BIGINT UNSIGNED NULL,
  `supplier_id` INT NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL,
  `unit_cost` DECIMAL(12,2) NULL,
  `received_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `received_by` INT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_inward_supplier` (`supplier_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `supplier_ledger` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `supplier_id` INT NOT NULL,
  `entry_type` ENUM('debit','credit') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `reference_type` VARCHAR(32) NULL,
  `reference_id` VARCHAR(64) NULL,
  `notes` VARCHAR(512) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_ledger` (`supplier_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `warehouse_transfers` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `from_location` VARCHAR(128) NOT NULL,
  `to_location` VARCHAR(128) NOT NULL,
  `product_name` VARCHAR(255) NOT NULL,
  `quantity` INT NOT NULL,
  `status` ENUM('pending','in_transit','completed','cancelled') NOT NULL DEFAULT 'pending',
  `created_by` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `supplier_payments` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `supplier_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_method` VARCHAR(32) NULL,
  `reference_no` VARCHAR(128) NULL,
  `paid_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `paid_by` INT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_supplier_payments` (`supplier_id`, `paid_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `permissions` (`slug`, `module`, `action`, `description`) VALUES
('suppliers.view', 'suppliers', 'view', 'View suppliers and purchase orders'),
('suppliers.manage', 'suppliers', 'manage', 'Manage suppliers, POs, and stock inward');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN ('suppliers.view', 'suppliers.manage')
WHERE r.slug IN ('ADMIN', 'MANAGER');
