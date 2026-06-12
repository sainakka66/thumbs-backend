const holdService = require('../../ledger/holdService');
const balanceService = require('../../ledger/balanceService');
const balanceRepo = require('../../repositories/balanceRepository');
const ledgerService = require('../../ledger/ledgerService');
const holdRepo = require('../../repositories/holdRepository');
const paymentRepo = require('../../repositories/paymentRepository');
const {
  resolveOrderByPayment,
  getLatestTransaction,
  appendTimeline,
  auditTransition,
  shouldSkipCapture,
} = require('../handlerContext');

async function applyCapture({ parsed, webhookEvent, correlationId, eventSource, io, emitPaymentEvent }) {
  const order = await resolveOrderByPayment(parsed);
  if (!order) return { ok: true, skipped: true, reason: 'order_not_found' };
  if (shouldSkipCapture(order)) return { ok: true, skipped: true, reason: 'already_captured', orderId: order.id };

  let transaction = await getLatestTransaction(order.id);
  if (!transaction) {
    transaction = await paymentRepo.createTransaction({
      paymentOrderId: order.id,
      status: 'PROCESSING',
      amountPaise: order.amount_paise,
    });
  }

  await balanceService.initializeForOrder(order);
  const bal = await balanceRepo.getByOrderId(order.id);
  if (bal && bal.held_balance_paise < order.amount_paise && bal.available_balance_paise > 0) {
    await balanceService.moveAvailableToHeld({
      orderId: order.id,
      amountPaise: Math.min(order.amount_paise, bal.available_balance_paise),
      correlationId,
    });
  }

  const activeHold = await holdRepo.findActiveHold({
    paymentOrderId: order.id,
    holdType: 'CREDIT',
    ledgerAccountCode: ledgerService.ACCOUNT_CODES.PLATFORM_HOLDING,
  });
  if (activeHold) {
    await holdService.creditEnact({
      holdId: activeHold.id,
      correlationId,
      eventSource,
      webhookEventId: webhookEvent.id,
    });
  }

  const providerPaymentId = parsed.providerPaymentId;
  if (providerPaymentId) {
    const dup = await paymentRepo.findTransactionByProviderPaymentId(parsed.provider, providerPaymentId);
    if (dup && dup.payment_order_id !== order.id) {
      return { ok: false, reason: 'payment_id_bound_to_other_order' };
    }
  }

  await paymentRepo.updateTransactionLifecycle(transaction.id, 'CAPTURED', {
    status: 'SUCCESS',
    providerPaymentId,
    correlationId,
    verifiedAt: new Date(),
    payerVpa: parsed.payment?.vpa || null,
    maskedMetadata: {
      method: parsed.payment?.method || null,
      provider: parsed.provider,
    },
  });

  const oldStage = order.lifecycle_stage;
  await paymentRepo.updateOrderLifecycle(order.id, 'CAPTURED', {
    status: 'SUCCESS',
    correlationId,
    capturedAt: new Date(),
  });

  if (providerPaymentId) {
    await ledgerService.recordCapture({
      order,
      transaction,
      providerPaymentId,
      correlationId,
    });
  }

  await appendTimeline({
    order,
    transaction,
    stage: 'CAPTURED',
    eventType: parsed.eventType,
    webhookEventId: webhookEvent.id,
    correlationId,
    details: { providerPaymentId },
  });

  await auditTransition({
    order,
    action: 'payment_captured',
    oldState: { lifecycleStage: oldStage },
    newState: { lifecycleStage: 'CAPTURED', providerPaymentId },
    correlationId,
    metadata: { webhookEventId: webhookEvent.id },
  });

  if (emitPaymentEvent && io) {
    emitPaymentEvent(io, order.user_id, {
      orderUuid: order.order_uuid,
      status: 'SUCCESS',
      lifecycleStage: 'CAPTURED',
      source: eventSource,
    });
  }

  return { ok: true, orderId: order.id, lifecycleStage: 'CAPTURED' };
}

async function handleCaptured(ctx) {
  return applyCapture({ ...ctx, eventSource: ctx.eventSource || 'WEBHOOK' });
}

module.exports = { handleCaptured, applyCapture };
