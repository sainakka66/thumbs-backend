const { getPaymentLimits } = require('../../config/paymentConfig');
const { ValidationError, NotFoundError, ForbiddenError } = require('../../lib/errors');
const entityRepo = require('../repositories/entityRepository');
const { parseAmountInr, inrToPaise, sanitizeString } = require('../utils/sanitize');
const { shouldEnforceUniqueIdentity } = require('../lib/paymentIdentityPolicy');

async function validatePaymentEntities({ authUser, customerId, distributorId, amountInr }) {
  const limits = getPaymentLimits();
  const amount = parseAmountInr(amountInr);
  if (!amount) throw new ValidationError('Invalid payment amount');

  const amountPaise = inrToPaise(amount);
  if (amountPaise < limits.minPaise || amountPaise > limits.maxPaise) {
    throw new ValidationError(
      `Amount must be between ₹${limits.minInr} and ₹${limits.maxInr}`
    );
  }

  let customer = null;
  if (customerId) {
    customer = await entityRepo.getCustomerById(customerId);
    if (!customer) throw new NotFoundError('Customer not found');
  }

  let distributor = null;
  if (distributorId) {
    distributor = await entityRepo.getDistributorById(distributorId);
    if (!distributor || !distributor.is_active || distributor.status !== 'active') {
      throw new NotFoundError('Distributor not found or inactive');
    }
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

  return {
    amount,
    amountPaise,
    customer,
    distributor,
    description: sanitizeString(`Payment by ${authUser.username}`, 512),
  };
}

module.exports = { validatePaymentEntities };
