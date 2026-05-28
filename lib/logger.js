const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'req.headers.authorization',
      'razorpay_signature',
      'razorpay_payment_id',
      'password',
      'token',
      'key_secret',
    ],
    censor: '[REDACTED]',
  },
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

module.exports = logger;
