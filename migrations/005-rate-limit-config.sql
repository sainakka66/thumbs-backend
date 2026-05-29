-- =============================================================================
-- ThumbsUpApp — Rate limit settings + cooldown persistence (run after 004)
-- Configure limits in SQL; clear blocks: DELETE FROM rate_limit_cooldowns;
-- =============================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS `rate_limit_settings` (
  `limiter_name` VARCHAR(64) NOT NULL,
  `window_ms` INT UNSIGNED NOT NULL DEFAULT 900000,
  `max_ip` INT UNSIGNED NOT NULL DEFAULT 10,
  `max_user` INT UNSIGNED NOT NULL DEFAULT 5,
  `max_device` INT UNSIGNED NOT NULL DEFAULT 40,
  `burst_max` INT UNSIGNED NOT NULL DEFAULT 3,
  `burst_window_ms` INT UNSIGNED NOT NULL DEFAULT 10000,
  `cooldown_ms` INT UNSIGNED NOT NULL DEFAULT 300000 COMMENT '0 = no cooldown lockout',
  `enabled` TINYINT(1) NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`limiter_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `rate_limit_cooldowns` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `limiter_name` VARCHAR(64) NOT NULL,
  `scope_key` VARCHAR(255) NOT NULL COMMENT 'e.g. auth_login:ip:203.0.113.1',
  `blocked_until` DATETIME(3) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_rate_limit_cooldown` (`limiter_name`, `scope_key`),
  KEY `idx_rate_limit_cooldown_until` (`blocked_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `rate_limit_settings` (
  `limiter_name`, `window_ms`, `max_ip`, `max_user`, `max_device`,
  `burst_max`, `burst_window_ms`, `cooldown_ms`, `enabled`
) VALUES
  ('auth_login', 900000, 10, 5, 40, 3, 10000, 300000, 1),
  ('pay_create', 60000, 20, 10, 40, 5, 10000, 0, 1),
  ('pay_verify', 60000, 40, 20, 40, 8, 10000, 0, 1),
  ('pay_webhook', 60000, 200, 1000, 1000, 50, 10000, 0, 1),
  ('risk_analyze', 60000, 30, 15, 40, 6, 10000, 0, 1),
  ('admin', 60000, 60, 30, 40, 10, 10000, 0, 1);
