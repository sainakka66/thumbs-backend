const { authenticator } = require('otplib');
const crypto = require('crypto');
const { queryRows } = require('../db/safeQuery');
const { encrypt, decrypt, hashValue } = require('./cryptoVault');
const { logSecurityEvent } = require('./securityAuditService');
const { sendOtpEmail, maskEmail } = require('../email/emailService');
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

async function getUserForOtp(userId) {
  const rows = await queryRows(
    `SELECT id, username, email, email_verified, status, is_active, deleted_at
     FROM users WHERE id = ? LIMIT 1`,
    [userId]
  ).catch(() => []);
  return rows[0] || null;
}

function validateUserForOtpDelivery(user) {
  if (!user) return { ok: false, message: 'User not found.' };
  if (user.deleted_at || user.is_active === 0) {
    return { ok: false, message: 'Account is not active. MFA email cannot be sent.' };
  }
  if (user.status === 'banned' || user.status === 'suspended') {
    return { ok: false, message: 'Account is not active. MFA email cannot be sent.' };
  }
  if (!user.email) {
    return {
      ok: false,
      message: 'No email address on file. Add and verify your email before using MFA.',
      code: 'EMAIL_MISSING',
    };
  }
  if (!user.email_verified) {
    return {
      ok: false,
      message: 'Email address is not verified. Verify your email before MFA can be used.',
      code: 'EMAIL_NOT_VERIFIED',
    };
  }
  return { ok: true, user };
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
    queryRows(
      `SELECT mfa_enabled, mfa_enforced, email, email_verified FROM users WHERE id = ? LIMIT 1`,
      [userId]
    ).catch(() => []),
    getMfaSettings(userId),
  ]);
  const user = userRows[0];
  if (!user) return { required: false, methods: [] };
  const enforced = Boolean(user.mfa_enforced || settings?.mfa_enforced);
  const totp = Boolean(settings?.totp_enabled);
  const emailOtp = Boolean(settings?.email_otp_enabled) && Boolean(user.email_verified);
  const anyEnabled = totp || emailOtp || Boolean(user.mfa_enabled);
  const required = enforced || anyEnabled;
  const methods = [];
  if (totp) methods.push('totp');
  if (emailOtp) methods.push('email');
  if (!methods.length && anyEnabled) methods.push('totp');
  return {
    required,
    methods,
    email: user.email,
    emailVerified: Boolean(user.email_verified),
    emailOtpConfigured: Boolean(settings?.email_otp_enabled),
  };
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

async function insertAndSendOtp(req, user, purpose) {
  const otp = String(crypto.randomInt(100000, 999999));
  const hash = hashValue(otp);
  const expires = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);

  await queryRows(
    `INSERT INTO user_mfa_email_otp (user_id, otp_hash, purpose, expires_at) VALUES (?, ?, ?, ?)`,
    [user.id, hash, purpose, expires]
  );

  logger.info(
    { userId: user.id, purpose, emailMasked: maskEmail(user.email) },
    'mfa_email_otp_generated'
  );

  try {
    await sendOtpEmail({
      to: user.email,
      username: user.username,
      otp,
      purpose,
    });
    await logSecurityEvent(req, {
      eventType: 'mfa_email_sent',
      userId: user.id,
      username: user.username,
      payload: { purpose, emailMasked: maskEmail(user.email) },
    });
  } catch (err) {
    logger.error(
      {
        userId: user.id,
        purpose,
        err: err.message,
        code: err.code,
        response: err.response,
        responseCode: err.responseCode,
        command: err.command,
        status: err.status,
      },
      'mfa_email_send_failed'
    );
    const isConfig =
      err.code === 'SMTP_NOT_CONFIGURED' ||
      err.code === 'RESEND_NOT_CONFIGURED';
    const isTimeout =
      String(err.message || '').toLowerCase().includes('connection timeout') ||
      err.code === 'ETIMEDOUT' ||
      err.code === 'ECONNECTION';
    const isResendDomain =
      err.code === 'RESEND_SEND_FAILED' &&
      String(err.message || '').toLowerCase().includes('domain is not verified');
    return {
      sent: false,
      message: isConfig
        ? 'Email delivery is not configured. Contact your administrator.'
        : isResendDomain
          ? 'Email sender domain is not verified with Resend. Set RESEND_FROM to onboarding@resend.dev on Render.'
          : isTimeout
            ? 'Email server connection timed out. If this persists, set RESEND_API_KEY on Render (HTTPS) or use SMTP_PORT=465.'
            : 'Unable to send verification email. Try again later.',
      code: err.code || 'EMAIL_SEND_FAILED',
    };
  }

  return {
    sent: true,
    message: `Verification code sent to ${maskEmail(user.email)}.`,
    emailMasked: maskEmail(user.email),
  };
}

/** First-time / new email: send OTP before email_verified is set. */
async function sendEmailOwnershipOtp(req, userId) {
  const user = await getUserForOtp(userId);
  if (!user) return { sent: false, message: 'User not found.' };
  if (!user.email) {
    return {
      sent: false,
      message: 'No email on file. Contact your administrator to add your email.',
      code: 'EMAIL_MISSING',
    };
  }
  if (user.email_verified) {
    return {
      sent: false,
      message: 'Email is already verified.',
      alreadyVerified: true,
      emailMasked: maskEmail(user.email),
    };
  }
  if (user.deleted_at || user.is_active === 0 || user.status === 'banned' || user.status === 'suspended') {
    return { sent: false, message: 'Account is not active.' };
  }
  return insertAndSendOtp(req, user, 'email_verify_login');
}

async function verifyAndMarkEmailVerified(req, userId, otp, purpose = 'email_verify_login') {
  const ok = await verifyEmailOtp(req, userId, otp, purpose);
  if (!ok) return false;
  await queryRows(
    `UPDATE users SET email_verified = 1, email_verified_at = NOW(), updated_at = NOW() WHERE id = ?`,
    [userId]
  );
  const rows = await queryRows(`SELECT username, email FROM users WHERE id = ? LIMIT 1`, [userId]).catch(() => []);
  await logSecurityEvent(req, {
    eventType: 'email_verified',
    userId,
    username: rows[0]?.username,
    payload: { emailMasked: maskEmail(rows[0]?.email), via: 'login_otp' },
  });
  return true;
}

async function sendEmailOtp(req, userId, purpose = 'mfa_login') {
  const user = await getUserForOtp(userId);
  const validation = validateUserForOtpDelivery(user);
  if (!validation.ok) {
    logger.warn({ userId, purpose, code: validation.code }, 'mfa_email_otp_rejected');
    return { sent: false, message: validation.message, code: validation.code };
  }

  return insertAndSendOtp(req, user, purpose);
}

async function verifyEmailOtp(req, userId, otp, purpose = 'mfa_login') {
  const normalized = String(otp).trim();
  const hash = hashValue(normalized);

  const rows = await queryRows(
    `SELECT id, expires_at, used_at FROM user_mfa_email_otp
     WHERE user_id = ? AND otp_hash = ? AND purpose = ?
     ORDER BY id DESC LIMIT 1`,
    [userId, hash, purpose]
  ).catch(() => []);

  if (!rows.length) {
    const expiredCandidate = await queryRows(
      `SELECT id FROM user_mfa_email_otp
       WHERE user_id = ? AND purpose = ? AND used_at IS NULL AND expires_at <= NOW()
       ORDER BY id DESC LIMIT 1`,
      [userId, purpose]
    ).catch(() => []);
    if (expiredCandidate.length) {
      await logSecurityEvent(req, {
        eventType: 'mfa_otp_expired',
        userId,
        payload: { purpose },
      });
    }
    await logSecurityEvent(req, {
      eventType: 'mfa_otp_failed',
      userId,
      payload: { purpose, reason: 'invalid_code' },
    });
    logger.warn({ userId, purpose }, 'mfa_email_otp_failed');
    return false;
  }

  const row = rows[0];
  if (row.used_at) {
    await logSecurityEvent(req, {
      eventType: 'mfa_otp_failed',
      userId,
      payload: { purpose, reason: 'already_used' },
    });
    return false;
  }
  if (new Date(row.expires_at) <= new Date()) {
    await logSecurityEvent(req, {
      eventType: 'mfa_otp_expired',
      userId,
      payload: { purpose },
    });
    return false;
  }

  await queryRows(`UPDATE user_mfa_email_otp SET used_at = NOW() WHERE id = ?`, [row.id]);
  await logSecurityEvent(req, {
    eventType: 'mfa_otp_verified',
    userId,
    payload: { purpose },
  });
  logger.info({ userId, purpose }, 'mfa_email_otp_verified');
  return true;
}

async function enableEmailOtp(req, userId) {
  const user = await getUserForOtp(userId);
  const validation = validateUserForOtpDelivery(user);
  if (!validation.ok) {
    return { ok: false, message: validation.message, code: validation.code };
  }

  await queryRows(
    `INSERT INTO user_mfa_settings (user_id, email_otp_enabled) VALUES (?, 1)
     ON DUPLICATE KEY UPDATE email_otp_enabled = 1, updated_at = NOW()`,
    [userId]
  );
  await queryRows(`UPDATE users SET mfa_enabled = 1 WHERE id = ?`, [userId]).catch(() => {});
  await logSecurityEvent(req, { eventType: 'mfa_enroll_email', userId });
  return { ok: true };
}

async function verifyMfaChallenge(req, userId, { method, code }) {
  if (method === 'totp' && (await verifyTotpCode(userId, code))) return true;
  if (method === 'email' && (await verifyEmailOtp(req, userId, code, 'mfa_login'))) return true;
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
  sendEmailOwnershipOtp,
  verifyAndMarkEmailVerified,
  verifyEmailOtp,
  enableEmailOtp,
  verifyMfaChallenge,
  validateUserForOtpDelivery,
  getUserForOtp,
};
