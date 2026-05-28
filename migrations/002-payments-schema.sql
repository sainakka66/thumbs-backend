-- =============================================================================
-- ThumbsUpApp — UPI / Razorpay payment infrastructure (run after 001)
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -----------------------------------------------------------------------------
-- Extend users (non-destructive; safe to re-run with errors ignored on dup cols)
-- -----------------------------------------------------------------------------
ALTER TABLE `users`
  ADD COLUMN `email` VARCHAR(255) NULL AFTER `username`,
  ADD COLUMN `phone` VARCHAR(30) NULL AFTER `email`,
  ADD COLUMN `role` ENUM('admin','distributor','user') NOT NULL DEFAULT 'user' AFTER `phone`,
  ADD COLUMN `status` ENUM('active','suspended','banned','pending') NOT NULL DEFAULT 'active' AFTER `role`,
  ADD COLUMN `is_active` TINYINT(1) NOT NULL DEFAULT 1 AFTER `status`,
  ADD COLUMN `deleted_at` DATETIME NULL AFTER `is_active`,
  ADD COLUMN `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `deleted_at`,
  ADD COLUMN `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_at`;

CREATE INDEX `idx_users_email` ON `users` (`email`);
CREATE INDEX `idx_users_phone` ON `users` (`phone`);
CREATE INDEX `idx_users_role_status` ON `users` (`role`, `status`);

-- -----------------------------------------------------------------------------
-- user_sessions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `session_token_hash` CHAR(64) NOT NULL,
  `device_fingerprint` VARCHAR(128) NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(512) NULL,
  `geo_country` VARCHAR(2) NULL,
  `geo_region` VARCHAR(64) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `last_seen_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_sessions_token` (`session_token_hash`),
  KEY `idx_user_sessions_user` (`user_id`),
  KEY `idx_user_sessions_device` (`device_fingerprint`),
  CONSTRAINT `fk_user_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- distributors
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `distributors` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NULL,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(30) NULL,
  `email` VARCHAR(255) NULL,
  `gstin` VARCHAR(20) NULL,
  `address` TEXT NULL,
  `status` ENUM('active','suspended','banned') NOT NULL DEFAULT 'active',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_distributors_code` (`code`),
  KEY `idx_distributors_user` (`user_id`),
  KEY `idx_distributors_status` (`status`),
  CONSTRAINT `fk_distributors_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- payment_orders
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_orders` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `order_uuid` CHAR(36) NOT NULL,
  `idempotency_key` VARCHAR(64) NULL,
  `user_id` INT NOT NULL,
  `customer_id` INT NULL,
  `distributor_id` INT NULL,
  `razorpay_order_id` VARCHAR(64) NULL,
  `amount_paise` INT UNSIGNED NOT NULL,
  `amount_inr` DECIMAL(12,2) NOT NULL,
  `gst_paise` INT UNSIGNED NOT NULL DEFAULT 0,
  `fee_paise` INT UNSIGNED NOT NULL DEFAULT 0,
  `currency` CHAR(3) NOT NULL DEFAULT 'INR',
  `status` ENUM(
    'CREATED','INITIATED','PENDING','PROCESSING','SUCCESS','FAILED',
    'CANCELLED','REFUNDED','BLOCKED','FLAGGED_FOR_REVIEW'
  ) NOT NULL DEFAULT 'CREATED',
  `payment_method` VARCHAR(32) NOT NULL DEFAULT 'upi',
  `description` VARCHAR(512) NULL,
  `receipt_ref` VARCHAR(64) NULL,
  `risk_score` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `verification_flags` JSON NULL,
  `metadata` JSON NULL,
  `device_fingerprint` VARCHAR(128) NULL,
  `ip_address` VARCHAR(45) NULL,
  `geo_country` VARCHAR(2) NULL,
  `geo_region` VARCHAR(64) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_orders_uuid` (`order_uuid`),
  UNIQUE KEY `uk_payment_orders_idempotency` (`idempotency_key`),
  UNIQUE KEY `uk_payment_orders_razorpay_order` (`razorpay_order_id`),
  KEY `idx_payment_orders_user` (`user_id`),
  KEY `idx_payment_orders_customer` (`customer_id`),
  KEY `idx_payment_orders_status` (`status`),
  KEY `idx_payment_orders_created` (`created_at`),
  CONSTRAINT `fk_payment_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_payment_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_payment_orders_distributor` FOREIGN KEY (`distributor_id`) REFERENCES `distributors` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- payment_transactions
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_order_id` BIGINT UNSIGNED NOT NULL,
  `razorpay_payment_id` VARCHAR(64) NULL,
  `upi_transaction_ref` VARCHAR(128) NULL,
  `payer_vpa` VARCHAR(128) NULL,
  `masked_metadata` JSON NULL,
  `status` ENUM(
    'CREATED','INITIATED','PENDING','PROCESSING','SUCCESS','FAILED',
    'CANCELLED','REFUNDED','BLOCKED','FLAGGED_FOR_REVIEW'
  ) NOT NULL DEFAULT 'PENDING',
  `amount_paise` INT UNSIGNED NOT NULL,
  `verified_at` DATETIME NULL,
  `failure_reason` VARCHAR(512) NULL,
  `timeline` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_tx_razorpay_payment` (`razorpay_payment_id`),
  KEY `idx_payment_tx_order` (`payment_order_id`),
  KEY `idx_payment_tx_status` (`status`),
  CONSTRAINT `fk_payment_tx_order` FOREIGN KEY (`payment_order_id`) REFERENCES `payment_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- payment_attempts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_attempts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_order_id` BIGINT UNSIGNED NOT NULL,
  `attempt_no` INT UNSIGNED NOT NULL DEFAULT 1,
  `status` VARCHAR(32) NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `device_fingerprint` VARCHAR(128) NULL,
  `error_code` VARCHAR(64) NULL,
  `error_message` VARCHAR(512) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_attempts_order` (`payment_order_id`),
  CONSTRAINT `fk_payment_attempts_order` FOREIGN KEY (`payment_order_id`) REFERENCES `payment_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- payment_webhooks
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_webhooks` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` VARCHAR(64) NULL,
  `event_type` VARCHAR(64) NOT NULL,
  `razorpay_order_id` VARCHAR(64) NULL,
  `razorpay_payment_id` VARCHAR(64) NULL,
  `signature_valid` TINYINT(1) NOT NULL DEFAULT 0,
  `payload_hash` CHAR(64) NOT NULL,
  `payload` JSON NOT NULL,
  `processed` TINYINT(1) NOT NULL DEFAULT 0,
  `processed_at` DATETIME NULL,
  `error_message` VARCHAR(512) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_webhooks_event` (`event_id`),
  UNIQUE KEY `uk_payment_webhooks_payload_hash` (`payload_hash`),
  KEY `idx_payment_webhooks_type` (`event_type`),
  KEY `idx_payment_webhooks_processed` (`processed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- payment_refunds
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_refunds` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_transaction_id` BIGINT UNSIGNED NOT NULL,
  `razorpay_refund_id` VARCHAR(64) NULL,
  `amount_paise` INT UNSIGNED NOT NULL,
  `status` ENUM('CREATED','PENDING','PROCESSED','FAILED') NOT NULL DEFAULT 'CREATED',
  `reason` VARCHAR(512) NULL,
  `initiated_by` INT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_refunds_razorpay` (`razorpay_refund_id`),
  KEY `idx_payment_refunds_tx` (`payment_transaction_id`),
  CONSTRAINT `fk_payment_refunds_tx` FOREIGN KEY (`payment_transaction_id`) REFERENCES `payment_transactions` (`id`),
  CONSTRAINT `fk_payment_refunds_user` FOREIGN KEY (`initiated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- payment_audit_logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` VARCHAR(32) NOT NULL,
  `entity_id` BIGINT UNSIGNED NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `actor_user_id` INT NULL,
  `old_status` VARCHAR(32) NULL,
  `new_status` VARCHAR(32) NULL,
  `details` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_audit_entity` (`entity_type`, `entity_id`),
  KEY `idx_payment_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- suspicious_activities
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `suspicious_activities` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NULL,
  `payment_order_id` BIGINT UNSIGNED NULL,
  `activity_type` VARCHAR(64) NOT NULL,
  `severity` ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `risk_score` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `ip_address` VARCHAR(45) NULL,
  `device_fingerprint` VARCHAR(128) NULL,
  `details` JSON NULL,
  `reviewed` TINYINT(1) NOT NULL DEFAULT 0,
  `reviewed_by` INT NULL,
  `reviewed_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_suspicious_user` (`user_id`),
  KEY `idx_suspicious_reviewed` (`reviewed`),
  KEY `idx_suspicious_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- blocked_entities
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `blocked_entities` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `entity_type` ENUM('user','device','ip','customer','distributor','vpa') NOT NULL,
  `entity_value` VARCHAR(255) NOT NULL,
  `reason` VARCHAR(512) NULL,
  `blocked_by` INT NULL,
  `expires_at` DATETIME NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blocked_entity` (`entity_type`, `entity_value`),
  KEY `idx_blocked_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- trusted_devices
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `trusted_devices` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `device_fingerprint` VARCHAR(128) NOT NULL,
  `label` VARCHAR(128) NULL,
  `last_ip` VARCHAR(45) NULL,
  `trusted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_trusted_device` (`user_id`, `device_fingerprint`),
  CONSTRAINT `fk_trusted_devices_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- api_request_logs
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `api_request_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_id` CHAR(36) NOT NULL,
  `user_id` INT NULL,
  `method` VARCHAR(10) NOT NULL,
  `path` VARCHAR(255) NOT NULL,
  `status_code` INT NULL,
  `duration_ms` INT UNSIGNED NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(512) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_api_logs_request` (`request_id`),
  KEY `idx_api_logs_user` (`user_id`),
  KEY `idx_api_logs_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- user_risk_scores
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `user_risk_scores` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `score` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `factors` JSON NULL,
  `last_calculated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_risk_user` (`user_id`),
  CONSTRAINT `fk_user_risk_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
