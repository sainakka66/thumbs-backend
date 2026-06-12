const { ValidationError, NotFoundError } = require('../../lib/errors');
const holdRepo = require('../repositories/holdRepository');
const timelineRepo = require('../repositories/timelineRepository');
const unifiedAuditRepo = require('../repositories/unifiedAuditRepository');
const { randomUuid } = require('../utils/crypto');
const { ACCOUNT_CODES } = require('./journalService');
const balanceService = require('./balanceService');

const TERMINAL_ORDER_STAGES = new Set(['SETTLED', 'FAILED', 'REFUNDED', 'CANCELLED']);

async function creditInquire({ order, amountPaise, correlationId, eventSource = 'WEBHOOK' }) {
  if (!order) throw new NotFoundError('Order not found for hold inquire');
  if (TERMINAL_ORDER_STAGES.has(order.lifecycle_stage)) {
    throw new ValidationError(`Cannot inquire hold on terminal stage: ${order.lifecycle_stage}`);
  }
  if (amountPaise > 0 && amountPaise !== order.amount_paise) {
    throw new ValidationError('Hold amount does not match order amount');
  }
  const effectiveAmount = amountPaise > 0 ? amountPaise : order.amount_paise;

  await timelineRepo.appendTimeline({
    paymentOrderId: order.id,
    stage: 'AUTHORIZED',
    eventSource,
    eventType: 'credit.inquire',
    correlationId,
    details: { amountPaise: effectiveAmount },
  });

  return { allowed: true, amountPaise: effectiveAmount };
}

async function creditHold({
  order,
  paymentTransactionId,
  amountPaise,
  correlationId,
  idempotencyKey,
  eventSource = 'WEBHOOK',
  webhookEventId,
}) {
  const effectiveAmount = amountPaise > 0 ? amountPaise : order.amount_paise;
  const holdKey = idempotencyKey || `credit-hold:${order.id}:${effectiveAmount}`;
  const existing = await holdRepo.findByIdempotencyKey(holdKey);
  if (existing) return { hold: existing, duplicate: true };

  const active = await holdRepo.findActiveHold({
    paymentOrderId: order.id,
    holdType: 'CREDIT',
    ledgerAccountCode: ACCOUNT_CODES.PLATFORM_HOLDING,
  });
  if (active) return { hold: active, duplicate: true };

  const hold = await holdRepo.createHold({
    holdUuid: randomUuid(),
    paymentOrderId: order.id,
    paymentTransactionId,
    holdType: 'CREDIT',
    holdPhase: 'HOLD',
    ledgerAccountCode: ACCOUNT_CODES.PLATFORM_HOLDING,
    amountPaise: effectiveAmount,
    idempotencyKey: holdKey,
    correlationId,
    metadata: { source: eventSource },
  });

  await timelineRepo.appendTimeline({
    paymentOrderId: order.id,
    paymentTransactionId,
    stage: 'RESERVED',
    eventSource,
    eventType: 'credit.hold',
    webhookEventId,
    correlationId,
    details: { holdId: hold.id, amountPaise: effectiveAmount },
  });

  await unifiedAuditRepo.logAudit({
    entityType: 'payment_hold',
    entityId: hold.id,
    action: 'credit_hold',
    newState: { holdPhase: 'HOLD', amountPaise: effectiveAmount, orderId: order.id },
    correlationId,
  });

  await balanceService.initializeForOrder(order);
  if (!existing && !active) {
    await balanceService.moveAvailableToHeld({
      orderId: order.id,
      amountPaise: effectiveAmount,
      correlationId,
    });
  }

  return { hold, duplicate: false };
}

async function creditEnact({ holdId, correlationId, eventSource = 'WEBHOOK', webhookEventId }) {
  const hold = await holdRepo.findById(holdId);
  if (!hold) throw new NotFoundError('Hold not found');
  if (hold.status === 'ENACTED') return { hold, duplicate: true };

  const updated = await holdRepo.updateHold(hold.id, {
    holdPhase: 'ENACT',
    status: 'ENACTED',
    enactedAt: new Date(),
  });

  await timelineRepo.appendTimeline({
    paymentOrderId: hold.payment_order_id,
    paymentTransactionId: hold.payment_transaction_id,
    stage: 'CAPTURED',
    eventSource,
    eventType: 'credit.enact',
    webhookEventId,
    correlationId,
    details: { holdId: hold.id },
  });

  await unifiedAuditRepo.logAudit({
    entityType: 'payment_hold',
    entityId: hold.id,
    action: 'credit_enact',
    newState: { holdPhase: 'ENACT', orderId: hold.payment_order_id },
    correlationId,
  });

  return { hold: updated, duplicate: false };
}

async function releaseActiveCreditHolds({ orderId, correlationId, reason, eventSource = 'WEBHOOK' }) {
  const holds = await holdRepo.listByOrderId(orderId);
  const released = [];
  for (const hold of holds) {
    if (hold.hold_type !== 'CREDIT' || hold.status !== 'ACTIVE') continue;
    const updated = await holdRepo.updateHold(hold.id, {
      holdPhase: 'RELEASE',
      status: 'RELEASED',
      releasedAt: new Date(),
    });
    released.push(updated);
    await unifiedAuditRepo.logAudit({
      entityType: 'payment_hold',
      entityId: hold.id,
      action: 'credit_release',
      newState: { reason },
      correlationId,
    });
  }
  if (released.length) {
    const totalReleased = released.reduce((sum, h) => sum + h.amount_paise, 0);
    await balanceService.releaseHeldToAvailable({
      orderId,
      amountPaise: totalReleased,
      correlationId,
      reason,
    });
    await timelineRepo.appendTimeline({
      paymentOrderId: orderId,
      stage: 'FAILED',
      eventSource,
      eventType: 'credit.release',
      correlationId,
      details: { reason, releasedHoldIds: released.map((h) => h.id) },
    });
  }
  return released;
}

async function debitInquire({ order, amountPaise, correlationId }) {
  if (!order) throw new NotFoundError('Order not found for refund inquire');
  const effectiveAmount = amountPaise > 0 ? amountPaise : order.amount_paise;
  if (!['CAPTURED', 'SETTLED', 'PROCESSING'].includes(order.lifecycle_stage)) {
    throw new ValidationError(`Refund inquire not allowed at stage ${order.lifecycle_stage}`);
  }
  return { allowed: true, amountPaise: effectiveAmount };
}

async function debitHold({
  order,
  paymentTransactionId,
  amountPaise,
  correlationId,
  idempotencyKey,
  eventSource = 'WEBHOOK',
  webhookEventId,
}) {
  const effectiveAmount = amountPaise > 0 ? amountPaise : order.amount_paise;
  const holdKey = idempotencyKey || `debit-hold:${order.id}:${effectiveAmount}`;
  const existing = await holdRepo.findByIdempotencyKey(holdKey);
  if (existing) return { hold: existing, duplicate: true };

  const hold = await holdRepo.createHold({
    holdUuid: randomUuid(),
    paymentOrderId: order.id,
    paymentTransactionId,
    holdType: 'DEBIT',
    holdPhase: 'HOLD',
    ledgerAccountCode: ACCOUNT_CODES.REFUND,
    amountPaise: effectiveAmount,
    idempotencyKey: holdKey,
    correlationId,
    metadata: { source: eventSource },
  });

  await timelineRepo.appendTimeline({
    paymentOrderId: order.id,
    paymentTransactionId,
    stage: 'PROCESSING',
    eventSource,
    eventType: 'debit.hold',
    webhookEventId,
    correlationId,
    details: { holdId: hold.id, amountPaise: effectiveAmount },
  });

  await unifiedAuditRepo.logAudit({
    entityType: 'payment_hold',
    entityId: hold.id,
    action: 'debit_hold',
    newState: { amountPaise: effectiveAmount, orderId: order.id },
    correlationId,
  });

  return { hold, duplicate: false };
}

async function debitEnact({ holdId, correlationId, eventSource = 'WEBHOOK', webhookEventId }) {
  const hold = await holdRepo.findById(holdId);
  if (!hold) throw new NotFoundError('Hold not found');
  if (hold.status === 'ENACTED') return { hold, duplicate: true };

  const updated = await holdRepo.updateHold(hold.id, {
    holdPhase: 'ENACT',
    status: 'ENACTED',
    enactedAt: new Date(),
  });

  await timelineRepo.appendTimeline({
    paymentOrderId: hold.payment_order_id,
    paymentTransactionId: hold.payment_transaction_id,
    stage: 'REFUNDED',
    eventSource,
    eventType: 'debit.enact',
    webhookEventId,
    correlationId,
    details: { holdId: hold.id },
  });

  await unifiedAuditRepo.logAudit({
    entityType: 'payment_hold',
    entityId: hold.id,
    action: 'debit_enact',
    correlationId,
  });

  return { hold: updated, duplicate: false };
}

module.exports = {
  creditInquire,
  creditHold,
  creditEnact,
  releaseActiveCreditHolds,
  debitInquire,
  debitHold,
  debitEnact,
};
