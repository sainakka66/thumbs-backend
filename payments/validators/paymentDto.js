const { ValidationError } = require('../../lib/errors');
const { sanitizeString } = require('../utils/sanitize');
const { parseStrictPositiveInt, validateUuid, assertNoSqlInjection } = require('../../lib/security/inputGuard');

function validateCreateOrder(body) {
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ValidationError('amount is required and must be positive');
  }
  const customerId = body?.customerId != null ? parseStrictPositiveInt(body.customerId, 'customerId') : null;
  const distributorId = body?.distributorId != null ? parseStrictPositiveInt(body.distributorId, 'distributorId') : null;
  const idempotencyKey = body?.idempotencyKey
    ? sanitizeString(body.idempotencyKey, 64)
    : null;
  if (idempotencyKey) assertNoSqlInjection(idempotencyKey, 'idempotencyKey');
  return { amount, customerId, distributorId, idempotencyKey, description: sanitizeString(body?.description, 512) };
}

function validateVerify(body) {
  const required = ['orderUuid', 'razorpayOrderId', 'razorpayPaymentId', 'razorpaySignature'];
  for (const k of required) {
    if (!body?.[k]) throw new ValidationError(`${k} is required`);
  }
  return {
    orderUuid: validateUuid(body.orderUuid, 'orderUuid'),
    razorpayOrderId: sanitizeString(body.razorpayOrderId, 64),
    razorpayPaymentId: sanitizeString(body.razorpayPaymentId, 64),
    razorpaySignature: sanitizeString(body.razorpaySignature, 256),
  };
}

module.exports = { validateCreateOrder, validateVerify };
