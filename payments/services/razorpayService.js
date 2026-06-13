const Razorpay = require('razorpay');
const crypto = require('crypto');
const { getRazorpayConfig } = require('../../config/paymentConfig');
const logger = require('../../lib/logger');

let instance = null;

function getClient() {
  if (!instance) {
    const { keyId, keySecret } = getRazorpayConfig();
    instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }
  return instance;
}

async function createRazorpayOrder({ amountPaise, receipt, notes }) {
  const client = getClient();
  const order = await client.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: receipt || `rcpt_${Date.now()}`,
    payment_capture: 1,
    notes: notes || {},
  });
  logger.info({ orderId: order.id, amount: amountPaise }, 'razorpay_order_created');
  return order;
}

function verifyPaymentSignature({ orderId, paymentId, signature }) {
  if (!orderId || !paymentId || !signature) return false;
  const { keySecret } = getRazorpayConfig();
  const body = `${orderId}|${paymentId}`;
  const expected = crypto.createHmac('sha256', keySecret).update(body).digest('hex');
  try {
    const sigBuf = Buffer.from(String(signature), 'utf8');
    const expBuf = Buffer.from(expected, 'utf8');
    if (sigBuf.length !== expBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  } catch {
    return false;
  }
}

function verifyWebhookSignature(rawBody, signature) {
  const { webhookSecret } = getRazorpayConfig();
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature || ''));
  } catch {
    return false;
  }
}

async function createRefund({ paymentId, amountPaise, notes }) {
  const client = getClient();
  const refund = await client.payments.refund(paymentId, {
    amount: amountPaise,
    notes: notes || {},
  });
  return refund;
}

async function fetchPayment(paymentId) {
  const client = getClient();
  return client.payments.fetch(paymentId);
}

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  createRefund,
  fetchPayment,
};
