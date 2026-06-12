const { ValidationError } = require('../../lib/errors');
const balanceRepo = require('../repositories/balanceRepository');
const unifiedAuditRepo = require('../repositories/unifiedAuditRepository');

async function initializeForOrder(order) {
  return balanceRepo.ensureBalanceRow(order.id, order.amount_paise);
}

async function moveAvailableToHeld({ orderId, amountPaise, correlationId }) {
  const bal = await balanceRepo.getByOrderId(orderId);
  if (!bal) throw new ValidationError('Balance row missing');
  if (bal.available_balance_paise < amountPaise) {
    throw new ValidationError('Insufficient available balance for hold');
  }
  const next = await balanceRepo.updateBalances(orderId, {
    availablePaise: bal.available_balance_paise - amountPaise,
    heldPaise: bal.held_balance_paise + amountPaise,
  });
  await unifiedAuditRepo.logAudit({
    entityType: 'payment_order_balance',
    entityId: orderId,
    action: 'balance_available_to_held',
    newState: next,
    correlationId,
  });
  return next;
}

async function moveHeldToSettled({ orderId, amountPaise, correlationId }) {
  const bal = await balanceRepo.getByOrderId(orderId);
  if (!bal) throw new ValidationError('Balance row missing');
  if (bal.held_balance_paise < amountPaise) {
    throw new ValidationError('Insufficient held balance for settlement');
  }
  const next = await balanceRepo.updateBalances(orderId, {
    heldPaise: bal.held_balance_paise - amountPaise,
    settledPaise: bal.settled_balance_paise + amountPaise,
  });
  await unifiedAuditRepo.logAudit({
    entityType: 'payment_order_balance',
    entityId: orderId,
    action: 'balance_held_to_settled',
    newState: next,
    correlationId,
  });
  return next;
}

async function releaseHeldToAvailable({ orderId, amountPaise, correlationId, reason }) {
  const bal = await balanceRepo.getByOrderId(orderId);
  if (!bal) return null;
  const releaseAmount = Math.min(amountPaise, bal.held_balance_paise);
  if (releaseAmount <= 0) return bal;
  const next = await balanceRepo.updateBalances(orderId, {
    availablePaise: bal.available_balance_paise + releaseAmount,
    heldPaise: bal.held_balance_paise - releaseAmount,
  });
  await unifiedAuditRepo.logAudit({
    entityType: 'payment_order_balance',
    entityId: orderId,
    action: 'balance_held_to_available',
    newState: { ...next, reason },
    correlationId,
  });
  return next;
}

module.exports = {
  initializeForOrder,
  moveAvailableToHeld,
  moveHeldToSettled,
  releaseHeldToAvailable,
};
