-- Fix payment_timeline event_source to include EVENT_BUS (matches refund_timeline / event bus)
SET NAMES utf8mb4;

ALTER TABLE `payment_timeline`
  MODIFY COLUMN `event_source` ENUM(
    'API','WEBHOOK','RECONCILIATION','REPLAY','ADMIN','SYSTEM','EVENT_BUS'
  ) NOT NULL;
