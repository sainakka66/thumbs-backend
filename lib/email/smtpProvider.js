const nodemailer = require('nodemailer');
const logger = require('../logger');

let cachedTransport = null;

function getSmtpConfig() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || '';
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  return { host, port, user, pass, secure };
}

function isSmtpConfigured() {
  const { user, pass } = getSmtpConfig();
  return Boolean(user && pass);
}

function getTransport() {
  if (cachedTransport) return cachedTransport;
  const { host, port, user, pass, secure } = getSmtpConfig();
  if (!user || !pass) {
    throw Object.assign(new Error('SMTP is not configured. Set SMTP_USER and SMTP_PASS.'), {
      code: 'SMTP_NOT_CONFIGURED',
    });
  }
  cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass },
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
  });
  return cachedTransport;
}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) {
    throw Object.assign(new Error('SMTP_FROM or SMTP_USER is required.'), { code: 'SMTP_NOT_CONFIGURED' });
  }
  const transport = getTransport();
  const info = await transport.sendMail({ from, to, subject, text, html });
  logger.info({ to, messageId: info.messageId, subject }, 'email_sent');
  return { messageId: info.messageId, accepted: info.accepted };
}

function resetTransportForTests() {
  cachedTransport = null;
}

module.exports = { sendMail, isSmtpConfigured, getSmtpConfig, resetTransportForTests };
