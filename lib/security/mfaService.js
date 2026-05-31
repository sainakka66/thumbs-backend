const { authenticator } = require('otplib');
const crypto = require('crypto');
const { queryRows } = require('../db/safeQuery');
const { encrypt, decrypt, hashValue } = require('./cryptoVault');
const { logSecurityEvent } = require('./securityAuditService');
const logger = require('../logger');

const OTP_EXPIRY_MIN = parseInt(process.env.MFA_EMAIL_OTP_EXPIRY_MIN || '10', 10);
const ISSUER = process.env.MFA_TOTP_ISSUER || 'Vaishnavi Agencies';

function generateBackupCodes(count = 10) {
  const codes = [];
  for (let i = 0; i < count; i += 1) {
    codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
  }
  return codes;
}

async function getMfaSettings(userId) {
  const rows = await queryRows(
    `SELECT user_id, totp_enabled, email_otp_enabled, backup_codes_generated, mfa_enforced
     FROM user_mfa_settings WHERE user_id = ? LIMIT 1`,
    [userId]
  ).catch(() => []);
  return rows[0] || null;
}

async function isMfaRequired(userId) {
  const [userRows, settings] = await Promise.all([
    queryRows(`SELECT mfa_enabled, mfa_enforced, email FROM users WHERE id = ? LIMIT 1`, [userId]).catch(() => []),
    getMfaSettings(userId),
  ]);
  const user = userRows[0];
  if (!user) return { required: false, methods: [] };
  const enforced = Boolean(user.mfa_enforced || settings?.mfa_enforced);
  const totp = Boolean(settings?.totp_enabled);
  const email = Boolean(settings?.email_otp_enabled);
  const anyEnabled = totp || email || Boolean(user.mfa_enabled);
  const required = enforced || anyEnabled;
  const methods = [];
  if (totp) methods.push('totp');
  if (email) methods.push('email');
  if (!methods.length && anyEnabled) methods.push('totp');
  return { required, methods, email: user.email };
}

async function setupTotp(userId, username) {
  const secret = authenticator.generateSecret();
  const enc = encrypt(secret);
  await queryRows(
    `INSERT INTO user_mfa_settings (user_id, totp_secret_enc, totp_enabled)
     VALUES (?, ?, 0)
     ON DUPLICATE KEY UPDATE totp_secret_enc = VALUES(totp_secret_enc), updated_at = NOW()`,
    [userId, enc]
  );
  const otpauthUrl = authenticator.keyuri(username || String(userId), ISSUER, secret);
  return { secret, otpauthUrl };
}

async function verifyAndEnableTotp(req, userId, token) {
  const rows = await queryRows(
    `SELECT totp_secret_enc FROM user_mfa_settings WHERE user_id = ? LIMIT 1`,
    [userId]
  ).catch(() => []);
  if (!rows[0]?.totp_secret_enc) return { ok: false, message: 'TOTP not initialized' };
  const secret = decrypt(rows[0].totp_secret_enc);
  if (!secret || !authenticator.verify({ token: String(token).replace(/\s/g, ''), secret })) {
    return { ok: false, message: 'Invalid authenticator code' };
  }
  await queryRows(
    `UPDATE user_mfa_settings SET totp_enabled = 1, updated_at = NOW() WHERE user_id = ?`,
    [userId]
  );
  await queryRows(`UPDATE users SET mfa_enabled = 1 WHERE id = ?`, [userId]).catch(() => {});
  await logSecurityEvent(req, { eventType: 'mfa_enroll_totp', userId, payload: {} });
  return { ok: true };
}

async function verifyTotpCode(userId, token) {
  const rows = await queryRows(
    `SELECT totp_secret_enc, totp_enabled FROM user_mfa_settings WHERE user_id = ? LIMIT 1`,
    [userId]
  ).catch(() => []);
  if (!rows.length || !rows[0].totp_enabled) return false;
  const secret = decrypt(rows[0].totp_secret_enc);
  if (!secret) return false;
  return authenticator.verify({ token: String(token).replace(/\s/g, ''), secret });
}

async function regenerateBackupCodes(req, userId) {
  await queryRows(`DELETE FROM user_mfa_backup_codes WHERE user_id = ?`, [userId]).catch(() => {});
  const plain = generateBackupCodes(10);
  for (const code of plain) {
    await queryRows(
      `INSERT INTO user_mfa_backup_codes (user_id, code_hash) VALUES (?, ?)`,
      [userId, hashValue(code)]
    );
  }
  await queryRows(
    `UPDATE user_mfa_settings SET backup_codes_generated = 1 WHERE user_id = ?`,
    [userId]
  ).catch(() => {});
  await logSecurityEvent(req, { eventType: 'mfa_enroll_totp', userId, payload: { backupCodes: true } });
  return plain;
}

async function verifyBackupCode(userId, code) {
  const hash = hashValue(String(code).replace(/\s/g, '').toUpperCase());
  const rows = await queryRows(
    `SELECT id FROM user_mfa_backup_codes WHERE user_id = ? AND code_hash = ? AND used_at IS NULL LIMIT 1`,
    [userId, hash]
  ).catch(() => []);
  if (!rows.length) return false;
  await queryRows(`UPDATE user_mfa_backup_codes SET used_at = NOW() WHERE id = ?`, [rows[0].id]);
  return true;
}

async function sendEmailOtp(req, userId, purpose = 'mfa_login') {
  const [user] = await queryRows(`SELECT email, username FROM users WHERE id = ? LIMIT 1`, [userId]).catch(() => []);
  const otp = String(crypto.randomInt(100000, 999999));
  const hash = hashValue(otp);
  const expires = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);
  await queryRows(
    `INSERT INTO user_mfa_email_otp (user_id, otp_hash, purpose, expires_at) VALUES (?, ?, ?, ?)`,
    [userId, hash, purpose, expires]
  );
  await queryRows(
    `INSERT INTO user_mfa_settings (user_id, email_otp_enabled) VALUES (?, 1)
     ON DUPLICATE KEY UPDATE email_otp_enabled = 1, updated_at = NOW()`,
    [userId]
  ).catch(() => {});
  logger.info({ userId, purpose, email: user?.email }, 'mfa_email_otp_generated');
  if (process.env.SMTP_HOST) {
    /* optional: wire nodemailer when SMTP_* env vars set */
  }
  return { sent: true, devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined, email: user?.email };
}

async function verifyEmailOtp(userId, otp, purpose = 'mfa_login') {
  const hash = hashValue(String(otp).trim());
  const rows = await queryRows(
    `SELECT id FROM user_mfa_email_otp
     WHERE user_id = ? AND otp_hash = ? AND purpose = ? AND used_at IS NULL AND expires_at > NOW()
     ORDER BY id DESC LIMIT 1`,
    [userId, hash, purpose]
  ).catch(() => []);
  if (!rows.length) return false;
  await queryRows(`UPDATE user_mfa_email_otp SET used_at = NOW() WHERE id = ?`, [rows[0].id]);
  return true;
}

async function enableEmailOtp(req, userId) {
  await queryRows(
    `INSERT INTO user_mfa_settings (user_id, email_otp_enabled) VALUES (?, 1)
     ON DUPLICATE KEY UPDATE email_otp_enabled = 1`,
    [userId]
  );
  await queryRows(`UPDATE users SET mfa_enabled = 1 WHERE id = ?`, [userId]).catch(() => {});
  await logSecurityEvent(req, { eventType: 'mfa_enroll_email', userId });
  return true;
}

async function verifyMfaChallenge(req, userId, { method, code }) {
  if (method === 'totp' && (await verifyTotpCode(userId, code))) return true;
  if (method === 'email' && (await verifyEmailOtp(userId, code))) return true;
  if (method === 'backup' && (await verifyBackupCode(userId, code))) {
    await logSecurityEvent(req, { eventType: 'mfa_backup_used', userId });
    return true;
  }
  return false;
}

module.exports = {
  getMfaSettings,
  isMfaRequired,
  setupTotp,
  verifyAndEnableTotp,
  verifyTotpCode,
  regenerateBackupCodes,
  verifyBackupCode,
  sendEmailOtp,
  verifyEmailOtp,
  enableEmailOtp,
  verifyMfaChallenge,
};
