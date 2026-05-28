-- =============================================================================
-- ThumbsUpApp — Security hardening (run after 002-payments-schema.sql)
-- =============================================================================

SET NAMES utf8mb4;

-- Webhook replay prevention
CREATE TABLE IF NOT EXISTS `webhook_replay_guard` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_id` VARCHAR(128) NOT NULL,
  `payload_hash` CHAR(64) NOT NULL,
  `signature_hash` CHAR(64) NULL,
  `received_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `webhook_timestamp` BIGINT NULL,
  `nonce` VARCHAR(64) NULL,
  `replay_detected` TINYINT(1) NOT NULL DEFAULT 0,
  `source_ip` VARCHAR(45) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_webhook_replay_event` (`event_id`),
  UNIQUE KEY `uk_webhook_replay_payload` (`payload_hash`),
  KEY `idx_webhook_replay_received` (`received_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `payment_webhooks`
  ADD COLUMN `replay_detected` TINYINT(1) NOT NULL DEFAULT 0 AFTER `signature_valid`,
  ADD COLUMN `webhook_timestamp` BIGINT NULL AFTER `replay_detected`,
  ADD COLUMN `nonce` VARCHAR(64) NULL AFTER `webhook_timestamp`;

-- Device trust extensions
CREATE TABLE IF NOT EXISTS `blocked_devices` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `device_fingerprint` VARCHAR(128) NOT NULL,
  `reason` VARCHAR(512) NULL,
  `blocked_by` INT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blocked_devices_fp` (`device_fingerprint`),
  KEY `idx_blocked_devices_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `device_sessions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `device_fingerprint` VARCHAR(128) NOT NULL,
  `browser_hash` VARCHAR(64) NULL,
  `os_name` VARCHAR(64) NULL,
  `timezone` VARCHAR(64) NULL,
  `language` VARCHAR(16) NULL,
  `ip_address` VARCHAR(45) NULL,
  `geo_country` VARCHAR(2) NULL,
  `geo_region` VARCHAR(64) NULL,
  `is_emulator` TINYINT(1) NOT NULL DEFAULT 0,
  `is_headless` TINYINT(1) NOT NULL DEFAULT 0,
  `trust_score` DECIMAL(5,2) NOT NULL DEFAULT 50.00,
  `last_seen_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_device_sessions_user_fp` (`user_id`, `device_fingerprint`),
  KEY `idx_device_sessions_fp` (`device_fingerprint`),
  CONSTRAINT `fk_device_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `trusted_devices`
  ADD COLUMN `browser_hash` VARCHAR(64) NULL AFTER `device_fingerprint`,
  ADD COLUMN `os_name` VARCHAR(64) NULL AFTER `browser_hash`,
  ADD COLUMN `timezone` VARCHAR(16) NULL AFTER `os_name`;

-- Security incidents & admin approvals
CREATE TABLE IF NOT EXISTS `security_incidents` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `incident_type` VARCHAR(64) NOT NULL,
  `severity` ENUM('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `user_id` INT NULL,
  `payment_order_id` BIGINT UNSIGNED NULL,
  `details` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `resolved` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_security_incidents_type` (`incident_type`),
  KEY `idx_security_incidents_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_action_approvals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `action_type` VARCHAR(64) NOT NULL,
  `target_ref` VARCHAR(128) NOT NULL,
  `requested_by` INT NOT NULL,
  `approved_by` INT NULL,
  `status` ENUM('PENDING','APPROVED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `payload` JSON NULL,
  `expires_at` DATETIME NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_approvals_status` (`status`),
  KEY `idx_admin_approvals_action` (`action_type`, `target_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `admin_audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_user_id` INT NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `target_type` VARCHAR(32) NULL,
  `target_id` VARCHAR(64) NULL,
  `details` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_audit_admin` (`admin_user_id`),
  KEY `idx_admin_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Composite performance indexes
CREATE INDEX `idx_payment_orders_user_status_created` ON `payment_orders` (`user_id`, `status`, `created_at`);
CREATE INDEX `idx_payment_orders_risk_status` ON `payment_orders` (`risk_score`, `status`);
CREATE INDEX `idx_payment_tx_order_status` ON `payment_transactions` (`payment_order_id`, `status`);
