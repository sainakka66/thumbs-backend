-- =============================================================================
-- ROLLBACK for 012-payment-ledger-platform.sql
-- Run manually only after review. Order matters (FK dependencies).
-- Does NOT remove legacy payment_webhooks or webhook_replay_guard.
-- =============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `payment_notifications`;
DROP TABLE IF EXISTS `notification_attempts`;
DROP TABLE IF EXISTS `notification_queue`;
DROP TABLE IF EXISTS `reconciliation_summary`;
DROP TABLE IF EXISTS `payment_settlements`;
DROP TABLE IF EXISTS `settlement_batches`;
DROP TABLE IF EXISTS `payment_timeline`;
DROP TABLE IF EXISTS `webhook_processing_attempts`;
DROP TABLE IF EXISTS `webhook_events`;
DROP TABLE IF EXISTS `payment_events`;
DROP TABLE IF EXISTS `ledger_entries`;
DROP TABLE IF EXISTS `payment_holds`;
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `ledger_accounts`;

-- Revert payment_refunds extensions (columns may not exist on partial rollback)
ALTER TABLE `payment_refunds`
  DROP COLUMN IF EXISTS `processed_at`,
  DROP COLUMN IF EXISTS `lifecycle_stage`,
  DROP COLUMN IF EXISTS `idempotency_key`,
  DROP COLUMN IF EXISTS `correlation_id`,
  DROP COLUMN IF EXISTS `provider_refund_id`,
  DROP COLUMN IF EXISTS `payment_provider`,
  DROP COLUMN IF EXISTS `refund_uuid`;

-- Revert payment_transactions extensions
ALTER TABLE `payment_transactions`
  DROP COLUMN IF EXISTS `settled_at`,
  DROP COLUMN IF EXISTS `correlation_id`,
  DROP COLUMN IF EXISTS `provider_payment_id`,
  DROP COLUMN IF EXISTS `payment_provider`,
  DROP COLUMN IF EXISTS `lifecycle_stage`;

-- Revert payment_orders extensions
ALTER TABLE `payment_orders`
  DROP COLUMN IF EXISTS `captured_at`,
  DROP COLUMN IF EXISTS `authorized_at`,
  DROP COLUMN IF EXISTS `settled_at`,
  DROP COLUMN IF EXISTS `provider_order_id`,
  DROP COLUMN IF EXISTS `correlation_id`,
  DROP COLUMN IF EXISTS `payment_provider`,
  DROP COLUMN IF EXISTS `lifecycle_stage`;

SET FOREIGN_KEY_CHECKS = 1;
