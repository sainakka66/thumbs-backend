const resendProvider = require('../../lib/email/resendProvider');
const smtpProvider = require('../../lib/email/smtpProvider');
const emailService = require('../../lib/email/emailService');

async function deliverEmail({ to, subject, text, html }) {
  const provider = emailService.resolveProvider();
  if (provider === 'resend') {
    return resendProvider.sendMail({ to, subject, text, html });
  }
  return smtpProvider.sendMail({ to, subject, text, html });
}

module.exports = { deliverEmail };
