-- =============================================================================
-- ThumbsUpApp — Ledger Phases 5–10 (incremental on 012)
-- Event bus extensions, balances, refund timeline, reconciliation runs
-- =============================================================================

SET NAMES utf8mb4;

-- -----------------------------------------------------------------------------
-- Phase 5: payment_events — retry + dead-letter
-- -----------------------------------------------------------------------------
ALTER TABLE `payment_events`
  MODIFY COLUMN `consumer_status` ENUM(
    'PENDING','PROCESSING','COMPLETED','FAILED','SKIPPED','DEAD_LETTER'
  ) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `max_retries` INT UNSIGNED NOT NULL DEFAULT 5 AFTER `retry_count`,
  ADD COLUMN `next_retry_at` DATETIME NULL AFTER `max_retries`;

CREATE INDEX `idx_payment_events_retry` ON `payment_events` (`consumer_status`, `next_retry_at`);

-- -----------------------------------------------------------------------------
-- Phase 6: per-order internal balance buckets (paise)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `payment_order_balances` (
  `payment_order_id` BIGINT UNSIGNED NOT NULL,
  `available_balance_paise` INT UNSIGNED NOT NULL DEFAULT 0,
  `held_balance_paise` INT UNSIGNED NOT NULL DEFAULT 0,
  `settled_balance_paise` INT UNSIGNED NOT NULL DEFAULT 0,
  `currency` CHAR(3) NOT NULL DEFAULT 'INR',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`payment_order_id`),
  CONSTRAINT `fk_order_balances_order` FOREIGN KEY (`payment_order_id`) REFERENCES `payment_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Phase 8: refund_timeline
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `refund_timeline` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `payment_refund_id` BIGINT UNSIGNED NOT NULL,
  `payment_order_id` BIGINT UNSIGNED NOT NULL,
  `payment_transaction_id` BIGINT UNSIGNED NULL,
  `stage` ENUM('CREATED','PENDING','PROCESSING','PROCESSED','FAILED','CANCELLED') NOT NULL,
  `event_source` ENUM('API','WEBHOOK','RECONCILIATION','REPLAY','ADMIN','SYSTEM','EVENT_BUS') NOT NULL,
  `event_type` VARCHAR(64) NULL,
  `webhook_event_id` BIGINT UNSIGNED NULL,
  `payment_event_id` BIGINT UNSIGNED NULL,
  `correlation_id` CHAR(36) NULL,
  `details` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_refund_timeline_refund` (`payment_refund_id`),
  KEY `idx_refund_timeline_order` (`payment_order_id`),
  CONSTRAINT `fk_refund_timeline_refund` FOREIGN KEY (`payment_refund_id`) REFERENCES `payment_refunds` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_refund_timeline_order` FOREIGN KEY (`payment_order_id`) REFERENCES `payment_orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE `payment_refunds`
  ADD COLUMN `is_partial` TINYINT(1) NOT NULL DEFAULT 0 AFTER `amount_paise`,
  ADD COLUMN `failed_at` DATETIME NULL AFTER `processed_at`,
  ADD COLUMN `failure_reason` VARCHAR(512) NULL AFTER `failed_at`;

-- -----------------------------------------------------------------------------
-- Phase 9: notification enum extension
-- -----------------------------------------------------------------------------
ALTER TABLE `notification_queue`
  MODIFY COLUMN `notification_type` ENUM(
    'PAYMENT_SUCCESS','PAYMENT_FAILED','PAYMENT_SETTLED',
    'REFUND_CREATED','REFUND_COMPLETED','SETTLEMENT_COMPLETED'
  ) NOT NULL;

-- -----------------------------------------------------------------------------
-- Phase 10: reconciliation runs + results
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reconciliation_runs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `run_uuid` CHAR(36) NOT NULL,
  `payment_provider` VARCHAR(32) NOT NULL DEFAULT 'razorpay',
  `trigger_source` ENUM('CRON','MANUAL','SYSTEM') NOT NULL DEFAULT 'CRON',
  `status` ENUM('RUNNING','COMPLETED','FAILED') NOT NULL DEFAULT 'RUNNING',
  `started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` DATETIME NULL,
  `summary` JSON NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reconciliation_runs_uuid` (`run_uuid`),
  KEY `idx_reconciliation_runs_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reconciliation_results` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `reconciliation_run_id` BIGINT UNSIGNED NOT NULL,
  `detector_type` ENUM(
    'MISSING_SETTLEMENT','MISSING_LEDGER','MISSING_REFUND',
    'ORPHAN_PAYMENT','DUPLICATE_EVENT'
  ) NOT NULL,
  `severity` ENUM('INFO','WARN','CRITICAL') NOT NULL DEFAULT 'WARN',
  `payment_order_id` BIGINT UNSIGNED NULL,
  `payment_transaction_id` BIGINT UNSIGNED NULL,
  `webhook_event_id` BIGINT UNSIGNED NULL,
  `provider_payment_id` VARCHAR(64) NULL,
  `finding_status` ENUM('OPEN','RESOLVED','IGNORED') NOT NULL DEFAULT 'OPEN',
  `details` JSON NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_reconciliation_results_run` (`reconciliation_run_id`),
  KEY `idx_reconciliation_results_detector` (`detector_type`),
  KEY `idx_reconciliation_results_order` (`payment_order_id`),
  CONSTRAINT `fk_reconciliation_results_run` FOREIGN KEY (`reconciliation_run_id`) REFERENCES `reconciliation_runs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
