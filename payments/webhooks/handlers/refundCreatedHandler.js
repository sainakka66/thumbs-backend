const holdService = require('../../ledger/holdService');
const paymentRepo = require('../../repositories/paymentRepository');
const refundService = require('../../refunds/refundService');
const {
  resolveOrderByPayment,
  getLatestTransaction,
  appendTimeline,
  auditTransition,
} = require('../handlerContext');

async function handleRefundCreated({ parsed, webhookEvent, correlationId, eventSource }) {
  const order = await resolveOrderByPayment(parsed);
  if (!order) return { ok: true, skipped: true, reason: 'order_not_found' };

  const transaction = await getLatestTransaction(order.id);
  const amountPaise = parsed.amountPaise || order.amount_paise;

  await holdService.debitInquire({ order, amountPaise, correlationId });
  await holdService.debitHold({
    order,
    paymentTransactionId: transaction?.id,
    amountPaise,
    correlationId,
    idempotencyKey: `debit-hold:${webhookEvent.id}:${parsed.providerRefundId || order.id}`,
    eventSource,
    webhookEventId: webhookEvent.id,
  });

  let refund = null;
  if (parsed.providerRefundId) {
    refund = await paymentRepo.findRefundByProviderRefundId(parsed.provider, parsed.providerRefundId);
    if (refund) {
      const partial = await refundService.validatePartialRefund({ transaction, order, amountPaise });
      await paymentRepo.updateRefundLifecycle(refund.id, {
        lifecycleStage: 'PENDING',
        status: 'PENDING',
        isPartial: partial.isPartial ? 1 : 0,
        correlationId,
      });
      await refundService.recordRefundCreated({
        order,
        transaction,
        refund,
        amountPaise,
        correlationId,
        eventSource,
        webhookEventId: webhookEvent.id,
        isPartial: partial.isPartial,
      });
    }
  }

  await appendTimeline({
    order,
    transaction,
    stage: 'PROCESSING',
    eventType: parsed.eventType,
    webhookEventId: webhookEvent.id,
    correlationId,
    details: { providerRefundId: parsed.providerRefundId },
  });

  await auditTransition({
    order,
    action: 'refund_created',
    newState: { providerRefundId: parsed.providerRefundId, amountPaise },
    correlationId,
    metadata: { webhookEventId: webhookEvent.id },
  });

  return { ok: true, orderId: order.id, refundId: refund?.id || null };
}

module.exports = { handleRefundCreated };
