-- =============================================================================
-- ThumbsUpApp — Payment Ledger Platform (012)
-- Lightweight double-entry ledger + event-sourced webhooks + notification queue
-- Run after: 002-payments-schema.sql, 003-security-hardening.sql
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- Chart of accounts (lightweight fintech ledger — not enterprise GL)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ledger_accounts` (
  `id` TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(32) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `account_type` ENUM('ASSET','LIABILITY','EQUITY','REVENUE','EXPENSE') NOT NULL,
  `normal_balance` ENUM('DEBIT','CREDIT') NOT NULL,
  `description` VARCHAR(512) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ledger_accounts_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `ledger_accounts` (`code`, `name`, `account_type`, `normal_balance`, `description`) VALUES
  ('CUSTOMER_RESERVE',   'Customer Reserve Account',      'LIABILITY', 'CREDIT', 'Customer prepayment / AR offset bucket'),
  ('PLATFORM_HOLDING',   'Platform Holding Account',      'ASSET',     'DEBIT',  'Captured funds in transit'),
  ('MERCHANT_SETTLEMENT','Merchant Settlement Account',   'ASSET',     'DEBIT',  'Funds cleared for merchant payout'),
  ('REFUND',             'Refund Account',                'LIABILITY', 'CREDIT', 'Refund obligations and processing');

-- -----------------------------------------------------------------------------
-- Extend payment_orders — lifecycle + provider + correlation
-- -----------------------------------------------------------------------------
ALTER TABLE `payment_orders`
  ADD COLUMN `lifecycle_stage` ENUM(
    'PENDING','AUTHORIZED','RESERVED','CAPTURED','PROCESSING','SETTLED','FAILED','REFUNDED','CANCELLED'
  ) NOT NULL DEFAULT 'PENDING' AFTER `status`,
  ADD COLUMN `payment_provider` VARCHAR(32) NOT NULL DEFAULT 'razorpay' AFTER `lifecycle_stage`,
  ADD COLUMN `correlation_id` CHAR(36) NULL AFTER `payment_provider`,
  ADD COLUMN `provider_order_id` VARCHAR(64) NULL AFTER `correlation_id`,
  ADD COLUMN `settled_at` DATETIME NULL AFTER `updated_at`,
  ADD COLUMN `authorized_at` DATETIME NULL AFTER `settled_at`,
  ADD COLUMN `captured_at` DATETIME NULL AFTER `authorized_at`;

-- Backfill lifecycle from legacy status
UPDATE `payment_orders` SET `lifecycle_stage` = 'SETTLED'   WHERE `status` = 'SUCCESS'   AND `lifecycle_stage` = 'PENDING';
UPDATE `payment_orders` SET `lifecycle_stage` = 'FAILED'    WHERE `status` = 'FAILED'    AND `lifecycle_stage` = 'PENDING';
UPDATE `payment_orders` SET `lifecycle_stage` = 'REFUNDED'  WHERE `status` = 'REFUNDED' AND `lifecycle_stage` = 'PENDING';
UPDATE `payment_orders` SET `lifecycle_stage` = 'CANCELLED' WHERE `status` = 'CANCELLED' AND `lifecycle_stage` = 'PENDING';
UPDATE `payment_orders` SET `lifecycle_stage` = 'PENDING'   WHERE `status` IN ('CREATED','INITIATED','FLAGGED_FOR_REVIEW','BLOCKED') AND `lifecycle_stage` = 'PENDING';
UPDATE `payment_orders` SET `provider_order_id` = `razorpay_order_id` WHERE `provider_order_id` IS NULL AND `razorpay_order_id` IS NOT NULL;

CREATE INDEX `idx_payment_orders_lifecycle` ON `payment_orders` (`lifecycle_stage`);
CREATE INDEX `idx_payment_orders_correlation` ON `payment_orders` (`correlation_id`);
CREATE INDEX `idx_payment_orders_provider_order` ON `payment_orders` (`payment_provider`, `provider_order_id`);

-- -----------------------------------------------------------------------------
-- Extend payment_transactions
-- -----------------------------------------------------------------------------
ALTER TABLE `payment_transactions`
  ADD COLUMN `lifecycle_stage` ENUM(
    'PENDING','AUTHORIZED','RESERVED','CAPTURED','PROCESSING','SETTLED','FAILED','REFUNDED','CANCELLED'
  ) NOT NULL DEFAULT 'PENDING' AFTER `status`,
  ADD COLUMN `payment_provider` VARCHAR(32) NOT NULL DEFAULT 'razorpay' AFTER `lifecycle_stage`,
  ADD COLUMN `provider_payment_id` VARCHAR(64) NULL AFTER `payment_provider`,
  ADD COLUMN `correlation_id` CHAR(36) NULL AFTER `provider_payment_id`,
  ADD COLUMN `settled_at` DATETIME NULL AFTER `verified_at`;

UPDATE `payment_transactions` SET `provider_payment_id` = `razorpay_payment_id`
  WHERE `provider_payment_id` IS NULL AND `razorpay_payment_id` IS NOT NULL;
UPDATE `payment_transactions` SET `lifecycle_stage` = 'SETTLED' WHERE `status` = 'SUCCESS' AND `lifecycle_stage` = 'PENDING';
UPDATE `payment_transactions` SET `lifecycle_stage` = 'FAILED'  WHERE `status` = 'FAILED'  AND `lifecycle_stage` = 'PENDING';

CREATE INDEX `idx_payment_tx_lifecycle` ON `payment_transactions` (`lifecycle_stage`);
CREATE INDEX `idx_payment_tx_provider_payment` ON `payment_transactions` (`payment_provider`, `provider_payment_id`);

-- -----------------------------------------------------------------------------
-- payment_holds — debit/credit inquire → hold → enact
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_holds` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `hold_uuid` CHAR(36) NOT NULL,
  `payment_order_id` BIGINT UNSIGNED NOT NULL,
  `payment_transaction_id` BIGINT UNSIGNED NULL,
  `hold_type` ENUM('DEBIT','CREDIT') NOT NULL,
  `hold_phase` ENUM('INQUIRE','HOLD','ENACT','RELEASE','EXPIRED') NOT NULL DEFAULT 'INQUIRE',
  `ledger_account_code` VARCHAR(32) NOT NULL,
  `amount_paise` INT UNSIGNED NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'INR',
  `status` ENUM('ACTIVE','RELEASED','ENACTED','EXPIRED','FAILED') NOT NULL DEFAULT 'ACTIVE',
  `idempotency_key` VARCHAR(128) NULL,
  `correlation_id` CHAR(36) NULL,
  `metadata` JSON NULL,
  `expires_at` DATETIME NULL,
  `enacted_at` DATETIME NULL,
  `released_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_holds_uuid` (`hold_uuid`),
  UNIQUE KEY `uk_payment_holds_idempotency` (`idempotency_key`),
  KEY `idx_payment_holds_order` (`payment_order_id`),
  KEY `idx_payment_holds_status` (`status`),
  CONSTRAINT `fk_payment_holds_order` FOREIGN KEY (`payment_order_id`) REFERENCES `payment_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payment_holds_tx` FOREIGN KEY (`payment_transaction_id`) REFERENCES `payment_transactions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- ledger_entries — double-entry journal lines
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `ledger_entries` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `journal_id` CHAR(36) NOT NULL,
  `ledger_account_id` TINYINT UNSIGNED NOT NULL,
  `ledger_account_code` VARCHAR(32) NOT NULL,
  `entry_type` ENUM('DEBIT','CREDIT') NOT NULL,
  `amount_paise` INT UNSIGNED NOT NULL,
  `currency` CHAR(3) NOT NULL DEFAULT 'INR',
  `payment_order_id` BIGINT UNSIGNED NULL,
  `payment_transaction_id` BIGINT UNSIGNED NULL,
  `payment_hold_id` BIGINT UNSIGNED NULL,
  `payment_refund_id` BIGINT UNSIGNED NULL,
  `reference_type` VARCHAR(32) NOT NULL,
  `reference_id` VARCHAR(64) NOT NULL,
  `description` VARCHAR(512) NULL,
  `correlation_id` CHAR(36) NULL,
  `idempotency_key` VARCHAR(128) NULL,
  `metadata` JSON NULL,
  `posted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ledger_entries_idempotency` (`idempotency_key`),
  KEY `idx_ledger_journal` (`journal_id`),
  KEY `idx_ledger_account` (`ledger_account_id`),
  KEY `idx_ledger_order` (`payment_order_id`),
  KEY `idx_ledger_correlation` (`correlation_id`),
  KEY `idx_ledger_reference` (`reference_type`, `reference_id`),
  CONSTRAINT `fk_ledger_account` FOREIGN KEY (`ledger_account_id`) REFERENCES `ledger_accounts` (`id`),
  CONSTRAINT `fk_ledger_order` FOREIGN KEY (`payment_order_id`) REFERENCES `payment_orders` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ledger_tx` FOREIGN KEY (`payment_transaction_id`) REFERENCES `payment_transactions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_ledger_hold` FOREIGN KEY (`payment_hold_id`) REFERENCES `payment_holds` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- payment_events — internal event bus (domain events)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_uuid` CHAR(36) NOT NULL,
  `event_type` VARCHAR(64) NOT NULL,
  `aggregate_type` VARCHAR(32) NOT NULL DEFAULT 'payment_order',
  `aggregate_id` BIGINT UNSIGNED NOT NULL,
  `payment_order_id` BIGINT UNSIGNED NULL,
  `payment_transaction_id` BIGINT UNSIGNED NULL,
  `webhook_event_id` BIGINT UNSIGNED NULL,
  `payload` JSON NOT NULL,
  `correlation_id` CHAR(36) NULL,
  `idempotency_key` VARCHAR(128) NOT NULL,
  `published_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `consumed_at` DATETIME NULL,
  `consumer_status` ENUM('PENDING','PROCESSING','COMPLETED','FAILED','SKIPPED') NOT NULL DEFAULT 'PENDING',
  `retry_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `last_error` VARCHAR(512) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_events_uuid` (`event_uuid`),
  UNIQUE KEY `uk_payment_events_idempotency` (`idempotency_key`),
  KEY `idx_payment_events_type` (`event_type`),
  KEY `idx_payment_events_aggregate` (`aggregate_type`, `aggregate_id`),
  KEY `idx_payment_events_consumer` (`consumer_status`),
  KEY `idx_payment_events_correlation` (`correlation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- webhook_events — raw inbound webhooks (store-first, process-second)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `webhook_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `webhook_uuid` CHAR(36) NOT NULL,
  `payment_provider` VARCHAR(32) NOT NULL DEFAULT 'razorpay',
  `provider_event_id` VARCHAR(128) NOT NULL,
  `event_type` VARCHAR(64) NOT NULL,
  `provider_order_id` VARCHAR(64) NULL,
  `provider_payment_id` VARCHAR(64) NULL,
  `provider_refund_id` VARCHAR(64) NULL,
  `payload` JSON NOT NULL,
  `payload_hash` CHAR(64) NOT NULL,
  `signature` VARCHAR(512) NULL,
  `signature_valid` TINYINT(1) NOT NULL DEFAULT 0,
  `processing_status` ENUM('RECEIVED','VALIDATED','PROCESSING','PROCESSED','FAILED','REPLAYED','SKIPPED') NOT NULL DEFAULT 'RECEIVED',
  `retry_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `correlation_id` CHAR(36) NULL,
  `source_ip` VARCHAR(45) NULL,
  `received_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` DATETIME NULL,
  `last_error` VARCHAR(512) NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_webhook_events_uuid` (`webhook_uuid`),
  UNIQUE KEY `uk_webhook_provider_event` (`payment_provider`, `provider_event_id`),
  UNIQUE KEY `uk_webhook_payload_hash` (`payload_hash`),
  KEY `idx_webhook_event_type` (`event_type`),
  KEY `idx_webhook_processing` (`processing_status`),
  KEY `idx_webhook_provider_order` (`provider_order_id`),
  KEY `idx_webhook_provider_payment` (`provider_payment_id`),
  KEY `idx_webhook_correlation` (`correlation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- webhook_processing_attempts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `webhook_processing_attempts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `webhook_event_id` BIGINT UNSIGNED NOT NULL,
  `attempt_no` INT UNSIGNED NOT NULL DEFAULT 1,
  `status` ENUM('STARTED','SUCCEEDED','FAILED','SKIPPED') NOT NULL DEFAULT 'STARTED',
  `error_message` VARCHAR(512) NULL,
  `duration_ms` INT UNSIGNED NULL,
  `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_webhook_attempts_event` (`webhook_event_id`),
  CONSTRAINT `fk_webhook_attempts_event` FOREIGN KEY (`webhook_event_id`) REFERENCES `webhook_events` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- payment_timeline — customer support / audit journey
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_timeline` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_order_id` BIGINT UNSIGNED NOT NULL,
  `payment_transaction_id` BIGINT UNSIGNED NULL,
  `stage` ENUM(
    'PENDING','AUTHORIZED','RESERVED','CAPTURED','PROCESSING','SETTLED','FAILED','REFUNDED','CANCELLED'
  ) NOT NULL,
  `event_source` ENUM('API','WEBHOOK','RECONCILIATION','REPLAY','ADMIN','SYSTEM') NOT NULL,
  `event_type` VARCHAR(64) NULL,
  `webhook_event_id` BIGINT UNSIGNED NULL,
  `payment_event_id` BIGINT UNSIGNED NULL,
  `correlation_id` CHAR(36) NULL,
  `actor_user_id` INT NULL,
  `details` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_timeline_order` (`payment_order_id`),
  KEY `idx_timeline_stage` (`stage`),
  KEY `idx_timeline_correlation` (`correlation_id`),
  CONSTRAINT `fk_timeline_order` FOREIGN KEY (`payment_order_id`) REFERENCES `payment_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- settlement_batches + payment_settlements
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `settlement_batches` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `batch_uuid` CHAR(36) NOT NULL,
  `payment_provider` VARCHAR(32) NOT NULL DEFAULT 'razorpay',
  `provider_batch_id` VARCHAR(64) NULL,
  `settlement_amount_paise` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `settlement_currency` CHAR(3) NOT NULL DEFAULT 'INR',
  `settlement_date` DATE NULL,
  `settlement_status` ENUM('PENDING','PROCESSING','COMPLETED','FAILED','RECONCILED') NOT NULL DEFAULT 'PENDING',
  `order_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `metadata` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_settlement_batches_uuid` (`batch_uuid`),
  KEY `idx_settlement_batches_status` (`settlement_status`),
  KEY `idx_settlement_batches_date` (`settlement_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `payment_settlements` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_order_id` BIGINT UNSIGNED NOT NULL,
  `payment_transaction_id` BIGINT UNSIGNED NOT NULL,
  `settlement_batch_id` BIGINT UNSIGNED NULL,
  `amount_paise` INT UNSIGNED NOT NULL,
  `settlement_status` ENUM('PENDING','PROCESSING','SETTLED','FAILED') NOT NULL DEFAULT 'PENDING',
  `correlation_id` CHAR(36) NULL,
  `idempotency_key` VARCHAR(128) NULL,
  `settled_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_settlements_idempotency` (`idempotency_key`),
  KEY `idx_payment_settlements_order` (`payment_order_id`),
  KEY `idx_payment_settlements_status` (`settlement_status`),
  CONSTRAINT `fk_payment_settlements_order` FOREIGN KEY (`payment_order_id`) REFERENCES `payment_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payment_settlements_tx` FOREIGN KEY (`payment_transaction_id`) REFERENCES `payment_transactions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payment_settlements_batch` FOREIGN KEY (`settlement_batch_id`) REFERENCES `settlement_batches` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Extend payment_refunds
-- -----------------------------------------------------------------------------
ALTER TABLE `payment_refunds`
  ADD COLUMN `refund_uuid` CHAR(36) NULL AFTER `id`,
  ADD COLUMN `payment_provider` VARCHAR(32) NOT NULL DEFAULT 'razorpay' AFTER `refund_uuid`,
  ADD COLUMN `provider_refund_id` VARCHAR(64) NULL AFTER `payment_provider`,
  ADD COLUMN `correlation_id` CHAR(36) NULL AFTER `provider_refund_id`,
  ADD COLUMN `idempotency_key` VARCHAR(128) NULL AFTER `correlation_id`,
  ADD COLUMN `lifecycle_stage` ENUM('CREATED','PENDING','PROCESSED','FAILED') NOT NULL DEFAULT 'CREATED' AFTER `status`,
  ADD COLUMN `processed_at` DATETIME NULL AFTER `updated_at`;

UPDATE `payment_refunds` SET `provider_refund_id` = `razorpay_refund_id`
  WHERE `provider_refund_id` IS NULL AND `razorpay_refund_id` IS NOT NULL;
UPDATE `payment_refunds` SET `lifecycle_stage` = 'PROCESSED' WHERE `status` = 'PROCESSED';
UPDATE `payment_refunds` SET `lifecycle_stage` = 'FAILED'    WHERE `status` = 'FAILED';
UPDATE `payment_refunds` SET `lifecycle_stage` = 'PENDING'   WHERE `status` = 'PENDING';

CREATE INDEX `idx_payment_refunds_provider` ON `payment_refunds` (`payment_provider`, `provider_refund_id`);
CREATE INDEX `idx_payment_refunds_correlation` ON `payment_refunds` (`correlation_id`);

-- -----------------------------------------------------------------------------
-- audit_logs — unified financial audit (extends payment_audit_logs concept)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
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
  UNIQUE KEY `uk_audit_logs_uuid` (`audit_uuid`),
  KEY `idx_audit_entity` (`entity_type`, `entity_id`),
  KEY `idx_audit_action` (`action`),
  KEY `idx_audit_correlation` (`correlation_id`),
  KEY `idx_audit_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- notification_queue + notification_attempts (Resend-backed)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notification_queue` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `notification_uuid` CHAR(36) NOT NULL,
  `notification_type` ENUM(
    'PAYMENT_SUCCESS','PAYMENT_FAILED','REFUND_CREATED','REFUND_COMPLETED','SETTLEMENT_COMPLETED'
  ) NOT NULL,
  `channel` ENUM('EMAIL','SOCKET') NOT NULL DEFAULT 'EMAIL',
  `recipient` VARCHAR(256) NOT NULL,
  `template_key` VARCHAR(64) NOT NULL,
  `template_data` JSON NULL,
  `payment_order_id` BIGINT UNSIGNED NULL,
  `payment_event_id` BIGINT UNSIGNED NULL,
  `status` ENUM('PENDING','SENT','DELIVERED','FAILED','CANCELLED') NOT NULL DEFAULT 'PENDING',
  `provider` VARCHAR(32) NOT NULL DEFAULT 'resend',
  `correlation_id` CHAR(36) NULL,
  `idempotency_key` VARCHAR(128) NOT NULL,
  `scheduled_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sent_at` DATETIME NULL,
  `delivered_at` DATETIME NULL,
  `failure_reason` VARCHAR(512) NULL,
  `provider_response` JSON NULL,
  `retry_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `max_retries` INT UNSIGNED NOT NULL DEFAULT 5,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_notification_queue_uuid` (`notification_uuid`),
  UNIQUE KEY `uk_notification_idempotency` (`idempotency_key`),
  KEY `idx_notification_status` (`status`),
  KEY `idx_notification_type` (`notification_type`),
  KEY `idx_notification_order` (`payment_order_id`),
  KEY `idx_notification_correlation` (`correlation_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notification_attempts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `notification_queue_id` BIGINT UNSIGNED NOT NULL,
  `attempt_no` INT UNSIGNED NOT NULL DEFAULT 1,
  `status` ENUM('STARTED','SENT','DELIVERED','FAILED') NOT NULL DEFAULT 'STARTED',
  `provider` VARCHAR(32) NOT NULL DEFAULT 'resend',
  `provider_message_id` VARCHAR(128) NULL,
  `provider_response` JSON NULL,
  `failure_reason` VARCHAR(512) NULL,
  `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` DATETIME NULL,
  PRIMARY KEY (`id`),
  KEY `idx_notification_attempts_queue` (`notification_queue_id`),
  CONSTRAINT `fk_notification_attempts_queue` FOREIGN KEY (`notification_queue_id`) REFERENCES `notification_queue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- payment_notifications — denormalized view / linkage table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_order_id` BIGINT UNSIGNED NOT NULL,
  `notification_queue_id` BIGINT UNSIGNED NOT NULL,
  `notification_type` VARCHAR(64) NOT NULL,
  `status` ENUM('PENDING','SENT','DELIVERED','FAILED') NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_payment_notifications_order` (`payment_order_id`),
  KEY `idx_payment_notifications_queue` (`notification_queue_id`),
  CONSTRAINT `fk_payment_notifications_order` FOREIGN KEY (`payment_order_id`) REFERENCES `payment_orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_payment_notifications_queue` FOREIGN KEY (`notification_queue_id`) REFERENCES `notification_queue` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- reconciliation_summary — dashboard rollup (updated by reconciliation jobs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reconciliation_summary` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `summary_date` DATE NOT NULL,
  `payment_provider` VARCHAR(32) NOT NULL DEFAULT 'razorpay',
  `total_payments` INT UNSIGNED NOT NULL DEFAULT 0,
  `successful_payments` INT UNSIGNED NOT NULL DEFAULT 0,
  `failed_payments` INT UNSIGNED NOT NULL DEFAULT 0,
  `pending_settlements` INT UNSIGNED NOT NULL DEFAULT 0,
  `refund_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `orphan_payments` INT UNSIGNED NOT NULL DEFAULT 0,
  `missing_ledger_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `missing_notification_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `reconciliation_status` ENUM('OK','WARN','CRITICAL') NOT NULL DEFAULT 'OK',
  `details` JSON NULL,
  `generated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reconciliation_summary_day` (`summary_date`, `payment_provider`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
