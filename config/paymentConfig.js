require('dotenv').config();

function requireInProduction(name, value, minLen = 1) {
  if (process.env.NODE_ENV === 'production' && (!value || String(value).length < minLen)) {
    throw new Error(`${name} is required in production`);
  }
  return value;
}

function getRazorpayConfig() {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

  if (process.env.NODE_ENV === 'production') {
    requireInProduction('RAZORPAY_KEY_ID', keyId, 8);
    requireInProduction('RAZORPAY_KEY_SECRET', keySecret, 8);
    requireInProduction('RAZORPAY_WEBHOOK_SECRET', webhookSecret, 8);
  }

  return { keyId, keySecret, webhookSecret };
}

function getPaymentLimits() {
  const minPaise = parseInt(process.env.PAYMENT_MIN_PAISE || '100', 10);
  const maxPaise = parseInt(process.env.PAYMENT_MAX_PAISE || '50000000', 10);
  return {
    minPaise: Math.max(100, minPaise),
    maxPaise: Math.min(50000000, maxPaise),
    minInr: minPaise / 100,
    maxInr: maxPaise / 100,
  };
}

function getFraudConfig() {
  return {
    velocityWindowMinutes: parseInt(process.env.FRAUD_VELOCITY_WINDOW_MIN || '10', 10),
    velocityMaxPayments: parseInt(process.env.FRAUD_VELOCITY_MAX || '5', 10),
    maxRetriesPerOrder: parseInt(process.env.FRAUD_MAX_RETRIES || '3', 10),
    highRiskThreshold: parseFloat(process.env.FRAUD_HIGH_RISK_THRESHOLD || '75'),
    blockThreshold: parseFloat(process.env.FRAUD_BLOCK_THRESHOLD || '90'),
    abnormalAmountMultiplier: parseFloat(process.env.FRAUD_AMOUNT_MULTIPLIER || '5'),
  };
}

function getPublicRazorpayKeyId() {
  return process.env.RAZORPAY_KEY_ID || '';
}

module.exports = {
  getRazorpayConfig,
  getPaymentLimits,
  getFraudConfig,
  getPublicRazorpayKeyId,
};
