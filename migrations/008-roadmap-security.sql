-- =============================================================================
-- Roadmap Phase 1 — MFA, sessions, device trust, login protection, security audit
-- Run after 007-performance-indexes.sql
-- =============================================================================

SET NAMES utf8mb4;

-- MFA settings per user
CREATE TABLE IF NOT EXISTS `user_mfa_settings` (
  `user_id` INT NOT NULL,
  `totp_secret_enc` TEXT NULL,
  `totp_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `email_otp_enabled` TINYINT(1) NOT NULL DEFAULT 0,
  `backup_codes_generated` TINYINT(1) NOT NULL DEFAULT 0,
  `mfa_enforced` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_mfa_settings_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_mfa_backup_codes` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `code_hash` CHAR(64) NOT NULL,
  `used_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mfa_backup_user` (`user_id`),
  CONSTRAINT `fk_mfa_backup_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `user_mfa_email_otp` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `otp_hash` CHAR(64) NOT NULL,
  `purpose` VARCHAR(32) NOT NULL DEFAULT 'mfa_login',
  `expires_at` DATETIME NOT NULL,
  `used_at` DATETIME NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_mfa_email_user_exp` (`user_id`, `expires_at`),
  CONSTRAINT `fk_mfa_email_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Login protection
CREATE TABLE IF NOT EXISTS `login_attempts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `username` VARCHAR(255) NOT NULL,
  `user_id` INT NULL,
  `ip_address` VARCHAR(45) NULL,
  `device_fingerprint` VARCHAR(128) NULL,
  `user_agent` VARCHAR(512) NULL,
  `success` TINYINT(1) NOT NULL DEFAULT 0,
  `failure_reason` VARCHAR(64) NULL,
  `risk_score` DECIMAL(5,2) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_login_attempts_user` (`username`, `created_at`),
  KEY `idx_login_attempts_ip` (`ip_address`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `account_lockouts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NULL,
  `username` VARCHAR(255) NOT NULL,
  `locked_until` DATETIME NOT NULL,
  `reason` VARCHAR(128) NOT NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_lockouts_username` (`username`, `locked_until`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Immutable security audit (append-only in application code)
CREATE TABLE IF NOT EXISTS `security_audit_events` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `event_type` VARCHAR(64) NOT NULL,
  `user_id` INT NULL,
  `username` VARCHAR(255) NULL,
  `entity_type` VARCHAR(32) NULL,
  `entity_id` VARCHAR(64) NULL,
  `payload` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `device_fingerprint` VARCHAR(128) NULL,
  `user_agent` VARCHAR(512) NULL,
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sec_audit_type_created` (`event_type`, `created_at`),
  KEY `idx_sec_audit_user` (`user_id`, `created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Extend trusted_devices (idempotent via migration runner)
ALTER TABLE `trusted_devices`
  ADD COLUMN IF NOT EXISTS `device_label` VARCHAR(128) NULL AFTER `device_fingerprint`,
  ADD COLUMN IF NOT EXISTS `browser_name` VARCHAR(64) NULL AFTER `device_label`,
  ADD COLUMN IF NOT EXISTS `os_name` VARCHAR(64) NULL AFTER `browser_name`,
  ADD COLUMN IF NOT EXISTS `ip_address` VARCHAR(45) NULL AFTER `os_name`,
  ADD COLUMN IF NOT EXISTS `is_verified` TINYINT(1) NOT NULL DEFAULT 0 AFTER `ip_address`,
  ADD COLUMN IF NOT EXISTS `verified_at` DATETIME NULL AFTER `is_verified`,
  ADD COLUMN IF NOT EXISTS `last_login_at` DATETIME NULL AFTER `verified_at`;

-- Extend user_sessions
ALTER TABLE `user_sessions`
  ADD COLUMN IF NOT EXISTS `browser_name` VARCHAR(64) NULL AFTER `user_agent`,
  ADD COLUMN IF NOT EXISTS `os_name` VARCHAR(64) NULL AFTER `browser_name`,
  ADD COLUMN IF NOT EXISTS `device_label` VARCHAR(128) NULL AFTER `os_name`,
  ADD COLUMN IF NOT EXISTS `is_trusted` TINYINT(1) NOT NULL DEFAULT 0 AFTER `device_label`,
  ADD COLUMN IF NOT EXISTS `revoked_at` DATETIME NULL AFTER `is_active`,
  ADD COLUMN IF NOT EXISTS `revoke_reason` VARCHAR(64) NULL AFTER `revoked_at`;

ALTER TABLE `users`
  ADD COLUMN IF NOT EXISTS `mfa_enabled` TINYINT(1) NOT NULL DEFAULT 0 AFTER `updated_at`,
  ADD COLUMN IF NOT EXISTS `mfa_enforced` TINYINT(1) NOT NULL DEFAULT 0 AFTER `mfa_enabled`;

INSERT IGNORE INTO `permissions` (`slug`, `module`, `action`, `description`) VALUES
('security.view', 'security', 'view', 'View own security settings and sessions'),
('security.manage', 'security', 'manage', 'Manage MFA, devices, and revoke own sessions'),
('security.admin', 'security', 'admin', 'Admin security policies and audit');

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN ('security.view', 'security.manage', 'security.admin')
WHERE r.slug = 'ADMIN';

INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r
JOIN `permissions` p ON p.slug IN ('security.view', 'security.manage')
WHERE r.slug IN ('MANAGER', 'SALESPERSON', 'DELIVERY');
