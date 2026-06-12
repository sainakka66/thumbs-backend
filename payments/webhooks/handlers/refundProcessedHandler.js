const holdService = require('../../ledger/holdService');
const ledgerService = require('../../ledger/ledgerService');
const holdRepo = require('../../repositories/holdRepository');
const paymentRepo = require('../../repositories/paymentRepository');
const refundService = require('../../refunds/refundService');
const {
  resolveOrderByPayment,
  getLatestTransaction,
  appendTimeline,
  auditTransition,
} = require('../handlerContext');

async function handleRefundProcessed({ parsed, webhookEvent, correlationId, eventSource, io, emitPaymentEvent }) {
  const order = await resolveOrderByPayment(parsed);
  if (!order) return { ok: true, skipped: true, reason: 'order_not_found' };

  const transaction = await getLatestTransaction(order.id);
  const amountPaise = parsed.amountPaise || order.amount_paise;
  const providerRefundId = parsed.providerRefundId;

  let refund = providerRefundId
    ? await paymentRepo.findRefundByProviderRefundId(parsed.provider, providerRefundId)
    : null;

  const activeDebitHold = await holdRepo.findActiveHold({
    paymentOrderId: order.id,
    holdType: 'DEBIT',
    ledgerAccountCode: ledgerService.ACCOUNT_CODES.REFUND,
  });
  if (activeDebitHold) {
    await holdService.debitEnact({
      holdId: activeDebitHold.id,
      correlationId,
      eventSource,
      webhookEventId: webhookEvent.id,
    });
  }

  if (refund) {
    await refundService.markRefundProcessed({
      refund,
      order,
      transaction,
      correlationId,
      eventSource,
      webhookEventId: webhookEvent.id,
    });
  }

  if (transaction) {
    await paymentRepo.updateTransactionLifecycle(transaction.id, 'REFUNDED', {
      status: 'REFUNDED',
      correlationId,
    });
  }

  const oldStage = order.lifecycle_stage;
  await paymentRepo.updateOrderLifecycle(order.id, 'REFUNDED', {
    status: 'REFUNDED',
    correlationId,
  });

  if (providerRefundId) {
    const fromAccount =
      oldStage === 'SETTLED'
        ? ledgerService.ACCOUNT_CODES.MERCHANT_SETTLEMENT
        : ledgerService.ACCOUNT_CODES.PLATFORM_HOLDING;
    await ledgerService.recordRefund({
      order,
      transaction,
      refund,
      providerRefundId,
      amountPaise,
      correlationId,
      fromAccountCode: fromAccount,
    });
  }

  await appendTimeline({
    order,
    transaction,
    stage: 'REFUNDED',
    eventType: parsed.eventType,
    webhookEventId: webhookEvent.id,
    correlationId,
    details: { providerRefundId },
  });

  await auditTransition({
    order,
    action: 'refund_processed',
    oldState: { lifecycleStage: oldStage },
    newState: { lifecycleStage: 'REFUNDED', providerRefundId },
    correlationId,
    metadata: { webhookEventId: webhookEvent.id },
  });

  if (emitPaymentEvent && io) {
    emitPaymentEvent(io, order.user_id, {
      orderUuid: order.order_uuid,
      status: 'REFUNDED',
      lifecycleStage: 'REFUNDED',
      source: eventSource,
    });
  }

  return { ok: true, orderId: order.id, lifecycleStage: 'REFUNDED' };
}

module.exports = { handleRefundProcessed };
