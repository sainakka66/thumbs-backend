-- Rollback migration 013 (manual). Does not drop 012 tables.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `reconciliation_results`;
DROP TABLE IF EXISTS `reconciliation_runs`;
DROP TABLE IF EXISTS `refund_timeline`;
DROP TABLE IF EXISTS `payment_order_balances`;

ALTER TABLE `payment_refunds`
  DROP COLUMN IF EXISTS `failure_reason`,
  DROP COLUMN IF EXISTS `failed_at`,
  DROP COLUMN IF EXISTS `is_partial`;

ALTER TABLE `payment_events`
  DROP COLUMN IF EXISTS `next_retry_at`,
  DROP COLUMN IF EXISTS `max_retries`;

SET FOREIGN_KEY_CHECKS = 1;
