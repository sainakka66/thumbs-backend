-- =============================================================================
-- ThumbsUpApp — Railway MySQL schema recovery (manual execution)
-- Database: railway
-- Source: server.js query analysis (inventory, customers, sales, deliveries)
--
-- RULES:
--   - Schema only (no seed data)
--   - Does not modify users table
--   - Run in dependency order (Steps 1–4)
--   - Review pre-flight and post-flight sections before/after DDL
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -----------------------------------------------------------------------------
-- PRE-FLIGHT (read-only — run before CREATE)
-- -----------------------------------------------------------------------------
-- SHOW TABLES;
-- SELECT VERSION() AS mysql_version, @@sql_mode AS sql_mode, @@foreign_key_checks AS fk_checks;
-- SELECT id, username FROM users LIMIT 5;

-- Expect: users exists; inventory, customers, sales, deliveries do NOT exist yet.
-- If any target table already exists, review structure before re-running CREATE.

-- =============================================================================
-- STEP 1: inventory (no foreign keys)
-- server.js: GET /products, /products/search, POST/PUT/DELETE /products,
--             GET /products/stats, GET /inventory
-- =============================================================================
CREATE TABLE IF NOT EXISTS `inventory` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `Name` VARCHAR(255) NULL COMMENT 'Product name — capital N matches server.js',
  `quantity` DECIMAL(12,2) NULL DEFAULT 0.00,
  `price` DECIMAL(12,2) NULL DEFAULT 0.00,
  `sku` VARCHAR(100) NULL,
  `category` VARCHAR(100) NULL,
  `size` VARCHAR(50) NULL,
  `bpc` INT UNSIGNED NULL DEFAULT 24,
  `reorder` DECIMAL(12,2) NULL DEFAULT 10.00,
  PRIMARY KEY (`id`),
  KEY `idx_inventory_sku` (`sku`),
  KEY `idx_inventory_name` (`Name`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- STEP 2: customers (no foreign keys)
-- server.js: GET/POST /customers, PUT/DELETE /customers/:id,
--             POST /customers/:id/pay, JOINs from sales/deliveries/dashboard
-- =============================================================================
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `shop_name` VARCHAR(255) NOT NULL,
  `owner_name` VARCHAR(255) NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(255) NULL,
  `address` TEXT NULL,
  `area` VARCHAR(100) NULL,
  `credit_limit` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `opening_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `outstanding_balance` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `idx_customers_shop_name` (`shop_name`),
  KEY `idx_customers_area` (`area`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- STEP 3: sales (FK → customers.id)
-- server.js: POST/GET /sales, DELETE /sales/:id,
--             dashboard: recent-sales, top-customers, today-revenue, weekly-sales
-- =============================================================================
CREATE TABLE IF NOT EXISTS `sales` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customer_id` INT NOT NULL,
  `product_name` VARCHAR(255) NULL,
  `quantity` INT NULL DEFAULT 0,
  `price_per_case` DECIMAL(12,2) NULL DEFAULT 0.00,
  `total_amount` DECIMAL(12,2) NULL DEFAULT 0.00,
  `amount_paid` DECIMAL(12,2) NULL DEFAULT 0.00,
  `payment_mode` VARCHAR(50) NULL,
  `notes` TEXT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sales_customer_id` (`customer_id`),
  KEY `idx_sales_created_at` (`created_at`),
  CONSTRAINT `fk_sales_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- STEP 4: deliveries (FK → customers.id)
-- server.js: GET/POST /deliveries, DELETE /deliveries/:id
-- =============================================================================
CREATE TABLE IF NOT EXISTS `deliveries` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customer_id` INT NOT NULL,
  `product_name` VARCHAR(255) NULL,
  `quantity` INT NULL DEFAULT 0,
  `delivery_date` DATE NULL,
  `driver_name` VARCHAR(100) NULL,
  `vehicle_no` VARCHAR(30) NULL,
  `status` VARCHAR(50) NOT NULL DEFAULT 'Pending',
  `notes` TEXT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_deliveries_customer_id` (`customer_id`),
  KEY `idx_deliveries_status` (`status`),
  KEY `idx_deliveries_delivery_date` (`delivery_date`),
  CONSTRAINT `fk_deliveries_customer`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- POST-FLIGHT (read-only — run after CREATE)
-- -----------------------------------------------------------------------------
-- SHOW TABLES;
-- DESCRIBE inventory;
-- DESCRIBE customers;
-- DESCRIBE sales;
-- DESCRIBE deliveries;

-- SELECT COUNT(*) AS inventory_rows FROM inventory;
-- SELECT COUNT(*) AS customer_rows FROM customers;
-- SELECT COUNT(*) AS sales_rows FROM sales;
-- SELECT COUNT(*) AS delivery_rows FROM deliveries;

-- Parity with GET /products/stats:
-- SELECT
--   COUNT(*) AS totalProducts,
--   SUM(quantity) AS totalStock,
--   SUM(CASE WHEN quantity <= reorder THEN 1 ELSE 0 END) AS lowStock,
--   SUM(quantity * price) AS totalValue
-- FROM inventory;

-- =============================================================================
-- ROLLBACK (use only if tables are empty / recovery failed — destroys data)
-- Run in reverse dependency order:
-- =============================================================================
-- DROP TABLE IF EXISTS `deliveries`;
-- DROP TABLE IF EXISTS `sales`;
-- DROP TABLE IF EXISTS `customers`;
-- DROP TABLE IF EXISTS `inventory`;
