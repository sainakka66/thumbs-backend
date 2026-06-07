const logger = require('../logger');

function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function getFromAddress() {
  return (
    process.env.RESEND_FROM ||
    process.env.SMTP_FROM ||
    process.env.SMTP_USER ||
    'onboarding@resend.dev'
  );
}

async function sendMail({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw Object.assign(new Error('RESEND_API_KEY is not configured.'), { code: 'RESEND_NOT_CONFIGURED' });
  }

  const from = getFromAddress();
  const body = {
    from,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
  };

  logger.info({ provider: 'resend', to, subject, fromDomain: from.split('@')[1] || null }, 'email_send_start');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data?.message || data?.error || `Resend API HTTP ${res.status}`;
    logger.error({ provider: 'resend', status: res.status, message }, 'email_send_failed');
    throw Object.assign(new Error(message), { code: 'RESEND_SEND_FAILED', status: res.status });
  }

  logger.info({ provider: 'resend', to, messageId: data.id, subject }, 'email_sent');
  return { messageId: data.id, accepted: [to] };
}

module.exports = { sendMail, isResendConfigured, getFromAddress };
