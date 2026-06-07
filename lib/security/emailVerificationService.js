const crypto = require('crypto');
const { queryRows } = require('../db/safeQuery');
const { hashValue } = require('./cryptoVault');
const { logSecurityEvent } = require('./securityAuditService');
const { sendEmailVerificationLink, maskEmail } = require('../email/emailService');
const logger = require('../logger');

const TOKEN_EXPIRY_HOURS = parseInt(process.env.EMAIL_VERIFY_EXPIRY_HOURS || '24', 10);

async function getEmailStatus(userId) {
  const rows = await queryRows(
    `SELECT email, email_verified, email_verified_at FROM users WHERE id = ? LIMIT 1`,
    [userId]
  ).catch(() => []);
  const user = rows[0];
  if (!user) return { hasEmail: false, emailVerified: false, email: null, emailMasked: null };
  return {
    hasEmail: Boolean(user.email),
    emailVerified: Boolean(user.email_verified),
    emailVerifiedAt: user.email_verified_at,
    email: user.email,
    emailMasked: maskEmail(user.email),
  };
}

async function assertUserCanVerifyEmail(userId) {
  const rows = await queryRows(
    `SELECT id, username, email, email_verified, status, is_active, deleted_at
     FROM users WHERE id = ? LIMIT 1`,
    [userId]
  ).catch(() => []);
  const user = rows[0];
  if (!user || user.deleted_at || user.is_active === 0) {
    return { ok: false, message: 'Account is not active.' };
  }
  if (user.status === 'banned' || user.status === 'suspended') {
    return { ok: false, message: 'Account is not active.' };
  }
  if (!user.email) {
    return { ok: false, message: 'No email address on file. Contact your administrator.' };
  }
  if (user.email_verified) {
    return { ok: false, message: 'Email is already verified.', alreadyVerified: true };
  }
  return { ok: true, user };
}

async function sendVerificationEmail(req, userId) {
  const check = await assertUserCanVerifyEmail(userId);
  if (!check.ok) {
    return { sent: false, message: check.message, alreadyVerified: check.alreadyVerified };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashValue(token);
  const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000);

  await queryRows(
    `INSERT INTO user_email_verification (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
    [userId, tokenHash, expires]
  );

  try {
    await sendEmailVerificationLink({
      to: check.user.email,
      username: check.user.username,
      token,
    });
  } catch (err) {
    logger.error({ userId, err: err.message }, 'email_verification_send_failed');
    return {
      sent: false,
      message: err.code === 'SMTP_NOT_CONFIGURED'
        ? 'Email delivery is not configured. Contact your administrator.'
        : 'Unable to send verification email. Try again later.',
    };
  }

  await logSecurityEvent(req, {
    eventType: 'email_verification_sent',
    userId,
    username: check.user.username,
    payload: { emailMasked: maskEmail(check.user.email) },
  });

  return {
    sent: true,
    message: `Verification email sent to ${maskEmail(check.user.email)}.`,
    emailMasked: maskEmail(check.user.email),
  };
}

async function verifyEmailToken(req, token) {
  const raw = String(token || '').trim();
  if (!raw || raw.length < 32) {
    return { ok: false, message: 'Invalid verification link.' };
  }

  const tokenHash = hashValue(raw);
  const rows = await queryRows(
    `SELECT v.id, v.user_id, v.expires_at, v.used_at, u.email, u.username, u.email_verified
     FROM user_email_verification v
     JOIN users u ON u.id = v.user_id
     WHERE v.token_hash = ?
     ORDER BY v.id DESC LIMIT 1`,
    [tokenHash]
  ).catch(() => []);

  if (!rows.length) {
    await logSecurityEvent(req, {
      eventType: 'email_verification_failed',
      payload: { reason: 'invalid_token' },
    });
    return { ok: false, message: 'Invalid or expired verification link.' };
  }

  const row = rows[0];
  if (row.used_at) {
    return { ok: false, message: 'This verification link has already been used.' };
  }
  if (new Date(row.expires_at) <= new Date()) {
    await logSecurityEvent(req, {
      eventType: 'email_verification_expired',
      userId: row.user_id,
      username: row.username,
    });
    return { ok: false, message: 'Verification link has expired. Request a new one.' };
  }

  await queryRows(`UPDATE user_email_verification SET used_at = NOW() WHERE id = ?`, [row.id]);
  await queryRows(
    `UPDATE users SET email_verified = 1, email_verified_at = NOW(), updated_at = NOW() WHERE id = ?`,
    [row.user_id]
  );

  await logSecurityEvent(req, {
    eventType: 'email_verified',
    userId: row.user_id,
    username: row.username,
    payload: { emailMasked: maskEmail(row.email) },
  });

  logger.info({ userId: row.user_id }, 'email_verified');
  return { ok: true, message: 'Email verified successfully.', userId: row.user_id };
}

async function resetVerificationOnEmailChange(userId) {
  await queryRows(
    `UPDATE users SET email_verified = 0, email_verified_at = NULL, updated_at = NOW() WHERE id = ?`,
    [userId]
  ).catch(() => {});
}

module.exports = {
  getEmailStatus,
  sendVerificationEmail,
  verifyEmailToken,
  resetVerificationOnEmailChange,
  assertUserCanVerifyEmail,
};
