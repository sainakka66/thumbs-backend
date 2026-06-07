const logger = require('../logger');

const RESEND_DEFAULT_FROM = 'Vaishnavi Agencies <onboarding@resend.dev>';

/** Public mail domains cannot be used as Resend "from" — must verify your own domain. */
const BLOCKED_FROM_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'icloud.com',
]);

function isResendConfigured() {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function extractEmailAddress(from) {
  const raw = String(from || '').trim();
  const angle = raw.match(/<([^>]+)>/);
  return (angle ? angle[1] : raw).trim().toLowerCase();
}

function isBlockedResendFrom(from) {
  const email = extractEmailAddress(from);
  const domain = email.split('@')[1] || '';
  return BLOCKED_FROM_DOMAINS.has(domain);
}

function getFromAddress() {
  const candidates = [
    process.env.RESEND_FROM,
    process.env.SMTP_FROM,
    process.env.SMTP_USER,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const trimmed = String(candidate).trim();
    if (!isBlockedResendFrom(trimmed)) {
      return trimmed;
    }
    logger.warn(
      { candidate: trimmed, reason: 'public_mail_domain_not_allowed_on_resend' },
      'resend_from_skipped'
    );
  }

  return process.env.RESEND_DEFAULT_FROM?.trim() || RESEND_DEFAULT_FROM;
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

  logger.info(
    { provider: 'resend', to, subject, from, fromDomain: extractEmailAddress(from).split('@')[1] || null },
    'email_send_start'
  );

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
    logger.error({ provider: 'resend', status: res.status, message, from }, 'email_send_failed');
    throw Object.assign(new Error(message), { code: 'RESEND_SEND_FAILED', status: res.status });
  }

  logger.info({ provider: 'resend', to, messageId: data.id, subject, from }, 'email_sent');
  return { messageId: data.id, accepted: [to] };
}

module.exports = { sendMail, isResendConfigured, getFromAddress, extractEmailAddress };
