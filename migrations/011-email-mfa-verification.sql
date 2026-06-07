-- =============================================================================
-- Email verification + production MFA email delivery support
-- Run after 010-roadmap-suppliers.sql
-- =============================================================================

SET NAMES utf8mb4;

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `email_verified` TINYINT(1) NOT NULL DEFAULT 0 AFTER `email`,
  ADD COLUMN IF NOT EXISTS `email_verified_at` DATETIME NULL AFTER `email_verified`;

CREATE TABLE IF NOT EXISTS `user_email_verification` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `token_hash` CHAR(64) NOT NULL,
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email_verify_user_exp` (`user_id`, `expires_at`),
  CONSTRAINT `fk_email_verify_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
