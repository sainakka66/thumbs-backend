const nodemailer = require('nodemailer');
const logger = require('../logger');

let cachedTransportKey = null;
let cachedTransport = null;

const CONNECT_TIMEOUT_MS = parseInt(process.env.SMTP_CONNECT_TIMEOUT_MS || '20000', 10);

function getSmtpConfig(overrides = {}) {
  const host = overrides.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = overrides.port || parseInt(process.env.SMTP_PORT || '587', 10);
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  const secure =
    overrides.secure !== undefined
      ? overrides.secure
      : process.env.SMTP_SECURE === 'true' || port === 465;
  return { host, port, user, pass, secure };
}

function isSmtpConfigured() {
  const { user, pass } = getSmtpConfig();
  return Boolean(user && pass);
}

function transportCacheKey(config) {
  return `${config.host}:${config.port}:${config.secure}:${config.user}`;
}

function createTransport(config) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    requireTLS: !config.secure,
    auth: { user: config.user, pass: config.pass },
    connectionTimeout: CONNECT_TIMEOUT_MS,
    greetingTimeout: CONNECT_TIMEOUT_MS,
    socketTimeout: CONNECT_TIMEOUT_MS,
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    family: 4,
  });
}

function getTransport(config = getSmtpConfig()) {
  if (!config.user || !config.pass) {
    throw Object.assign(new Error('SMTP is not configured. Set SMTP_USER and SMTP_PASS.'), {
      code: 'SMTP_NOT_CONFIGURED',
    });
  }
  const key = transportCacheKey(config);
  if (cachedTransport && cachedTransportKey === key) return cachedTransport;
  cachedTransportKey = key;
  cachedTransport = createTransport(config);
  return cachedTransport;
}

function isConnectionError(err) {
  const msg = String(err?.message || '').toLowerCase();
  const code = String(err?.code || '').toUpperCase();
  return (
    code === 'ETIMEDOUT' ||
    code === 'ECONNECTION' ||
    code === 'ESOCKET' ||
    msg.includes('connection timeout') ||
    msg.includes('greeting never received') ||
    msg.includes('connect econnrefused') ||
    msg.includes('connect etimedout')
  );
}

function getSmtpDiagnostics(config) {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    userSet: Boolean(config.user),
    passSet: Boolean(config.pass),
    connectTimeoutMs: CONNECT_TIMEOUT_MS,
  };
}

async function sendMailOnce({ from, to, subject, text, html }, config) {
  const transport = getTransport(config);
  logger.info(
    { provider: 'smtp', ...getSmtpDiagnostics(config), to, subject },
    'email_send_start'
  );
  const info = await transport.sendMail({ from, to, subject, text, html });
  logger.info(
    { provider: 'smtp', to, messageId: info.messageId, subject, port: config.port },
    'email_sent'
  );
  return { messageId: info.messageId, accepted: info.accepted };
}

async function sendMail({ to, subject, text, html }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from) {
    throw Object.assign(new Error('SMTP_FROM or SMTP_USER is required.'), { code: 'SMTP_NOT_CONFIGURED' });
  }

  const primary = getSmtpConfig();
  try {
    return await sendMailOnce({ from, to, subject, text, html }, primary);
  } catch (err) {
    logger.error(
      {
        provider: 'smtp',
        ...getSmtpDiagnostics(primary),
        err: err.message,
        code: err.code,
        response: err.response,
        responseCode: err.responseCode,
        command: err.command,
      },
      'email_send_failed'
    );

    if (primary.port === 587 && isConnectionError(err)) {
      const fallback = { ...primary, port: 465, secure: true };
      cachedTransport = null;
      cachedTransportKey = null;
      logger.warn({ fallbackPort: 465 }, 'smtp_retry_port_465');
      try {
        return await sendMailOnce({ from, to, subject, text, html }, fallback);
      } catch (fallbackErr) {
        logger.error(
          {
            provider: 'smtp',
            ...getSmtpDiagnostics(fallback),
            err: fallbackErr.message,
            code: fallbackErr.code,
            response: fallbackErr.response,
            responseCode: fallbackErr.responseCode,
            command: fallbackErr.command,
          },
          'email_send_failed'
        );
        throw fallbackErr;
      }
    }
    throw err;
  }
}

function resetTransportForTests() {
  cachedTransport = null;
  cachedTransportKey = null;
}

module.exports = {
  sendMail,
  isSmtpConfigured,
  getSmtpConfig,
  getSmtpDiagnostics,
  isConnectionError,
  resetTransportForTests,
};
