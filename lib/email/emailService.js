const { sendMail, isSmtpConfigured } = require('./smtpProvider');
const logger = require('../logger');

const APP_NAME = process.env.APP_NAME || 'Vaishnavi Agencies';
const OTP_EXPIRY_MIN = parseInt(process.env.MFA_EMAIL_OTP_EXPIRY_MIN || '10', 10);

function maskEmail(email) {
  if (!email || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  const visible = local.length <= 2 ? local[0] : `${local.slice(0, 2)}***`;
  return `${visible}@${domain}`;
}

function getFrontendBaseUrl() {
  const explicit = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  if (explicit) return explicit;
  const cors = (process.env.CORS_ORIGINS || '').split(',')[0]?.trim();
  return cors || 'http://localhost:5173';
}

async function sendViaProvider(payload) {
  const provider = (process.env.EMAIL_PROVIDER || 'smtp').toLowerCase();
  if (provider === 'smtp') {
    if (!isSmtpConfigured()) {
      throw Object.assign(new Error('Email delivery is not configured.'), { code: 'SMTP_NOT_CONFIGURED' });
    }
    return sendMail(payload);
  }
  // Future: resend, sendgrid adapters plug in here with the same payload shape.
  throw Object.assign(new Error(`Email provider "${provider}" is not implemented.`), {
    code: 'EMAIL_PROVIDER_UNSUPPORTED',
  });
}

async function sendOtpEmail({ to, username, otp, purpose }) {
  const purposeLabel =
    purpose === 'device_verify'
      ? 'device verification'
      : purpose === 'login_challenge'
        ? 'sign-in and device verification'
      : purpose === 'email_verify'
        ? 'email address verification'
        : 'sign-in verification';

  const subject = `${APP_NAME} — Your ${purposeLabel} code`;
  const text = [
    `Hello${username ? ` ${username}` : ''},`,
    '',
    `Your one-time verification code is: ${otp}`,
    '',
    `This code expires in ${OTP_EXPIRY_MIN} minutes and can only be used once.`,
    'If you did not request this code, ignore this email.',
    '',
    APP_NAME,
  ].join('\n');

  const html = `
    <p>Hello${username ? ` ${username}` : ''},</p>
    <p>Your one-time <strong>${purposeLabel}</strong> code is:</p>
    <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${otp}</p>
    <p>This code expires in <strong>${OTP_EXPIRY_MIN} minutes</strong> and can only be used once.</p>
    <p>If you did not request this code, you can safely ignore this email.</p>
    <p>— ${APP_NAME}</p>
  `;

  return sendViaProvider({ to, subject, text, html });
}

async function sendEmailVerificationLink({ to, username, token }) {
  const verifyUrl = `${getFrontendBaseUrl()}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = `${APP_NAME} — Verify your email address`;
  const text = [
    `Hello${username ? ` ${username}` : ''},`,
    '',
    'Please verify your email address by opening this link:',
    verifyUrl,
    '',
    'This link expires in 24 hours and can only be used once.',
    'If you did not create this account, ignore this email.',
    '',
    APP_NAME,
  ].join('\n');

  const html = `
    <p>Hello${username ? ` ${username}` : ''},</p>
    <p>Please verify your email address to enable MFA and security notifications.</p>
    <p><a href="${verifyUrl}">Verify email address</a></p>
    <p>Or copy this link: ${verifyUrl}</p>
    <p>This link expires in <strong>24 hours</strong> and can only be used once.</p>
    <p>— ${APP_NAME}</p>
  `;

  const result = await sendViaProvider({ to, subject, text, html });
  logger.info({ to: maskEmail(to), purpose: 'email_verify_link' }, 'email_verification_sent');
  return result;
}

module.exports = {
  sendOtpEmail,
  sendEmailVerificationLink,
  maskEmail,
  isSmtpConfigured,
  getFrontendBaseUrl,
};
