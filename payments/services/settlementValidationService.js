const { ForbiddenError, ValidationError, ConflictError, NotFoundError } = require('../../lib/errors');
const entityRepo = require('../repositories/entityRepository');
const { shouldEnforceUniqueIdentity } = require('../lib/paymentIdentityPolicy');
const blockedRepo = require('../repositories/blockedRepository');
const paymentRepo = require('../repositories/paymentRepository');
const { getFraudConfig } = require('../../config/paymentConfig');
const { parseStrictPositiveInt } = require('../../lib/security/inputGuard');

async function validateBeforeSettlement({
  authUser,
  customerId,
  distributorId,
  amountPaise,
  orderUuid,
  idempotencyKey,
  deviceTrust,
  ip,
  deviceFingerprint,
  riskScore,
}) {
  if (!authUser?.is_active && authUser?.is_active !== undefined) {
    throw new ForbiddenError('User account inactive');
  }
  if (authUser.status === 'banned' || authUser.status === 'suspended') {
    throw new ForbiddenError('User restricted');
  }

  if (await blockedRepo.isBlocked('user', String(authUser.id))) {
    throw new ForbiddenError('User blocked from payments');
  }
  if (ip && (await blockedRepo.isBlocked('ip', ip))) {
    throw new ForbiddenError('IP blocked');
  }
  if (deviceFingerprint && (await blockedRepo.isBlocked('device', deviceFingerprint))) {
    throw new ForbiddenError('Device blocked');
  }

  let customer = null;
  if (customerId) {
    const cid = parseStrictPositiveInt(customerId, 'customerId');
    customer = await entityRepo.getCustomerById(cid);
    if (!customer) throw new NotFoundError('Customer not found');
    if (await blockedRepo.isBlocked('customer', String(cid))) {
      throw new ForbiddenError('Customer blocked');
    }
  }

  let distributor = null;
  if (distributorId) {
    const did = parseStrictPositiveInt(distributorId, 'distributorId');
    distributor = await entityRepo.getDistributorById(did);
    if (!distributor?.is_active || distributor.status !== 'active') {
      throw new NotFoundError('Distributor invalid');
    }
  }

  if (customerId && distributorId && customer && distributor) {
    throw new ValidationError('Cannot settle to both customer and distributor in one payment');
  }

  if (idempotencyKey) {
    const dup = await paymentRepo.findByIdempotencyKey(idempotencyKey);
    if (dup && dup.status === 'SUCCESS') {
      throw new ConflictError('Duplicate successful payment');
    }
  }

  if (orderUuid) {
    const existing = await paymentRepo.findOrderByUuid(orderUuid);
    if (existing?.status === 'SUCCESS') {
      throw new ConflictError('Order already settled');
    }
  }

  const config = getFraudConfig();
  if (riskScore != null && riskScore >= config.blockThreshold) {
    throw new ForbiddenError('Risk score too high for settlement');
  }

  if (deviceTrust?.trustScore != null && deviceTrust.trustScore < 20) {
    throw new ForbiddenError('Device not trusted for settlement');
  }

  if (shouldEnforceUniqueIdentity(authUser) && (authUser.email || authUser.phone)) {
    const dupes = await entityRepo.countDuplicateIdentity({
      email: authUser.email,
      phone: authUser.phone,
      excludeUserId: authUser.id,
    });
    if (dupes > 0) {
      throw new ForbiddenError('Identity verification failed');
    }
  }

  if (customerId && distributorId == null && authUser.id && customer) {
    const selfPay = await entityRepo.countDuplicateIdentity({
      email: customer.email,
      phone: customer.phone,
      excludeUserId: authUser.id,
    });
    if (selfPay > 0 && amountPaise > 500000) {
      throw new ForbiddenError('Self-payment pattern detected');
    }
  }

  return { customer, distributor, validated: true };
}

module.exports = { validateBeforeSettlement };
