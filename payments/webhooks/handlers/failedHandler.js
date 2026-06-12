const holdService = require('../../ledger/holdService');
const paymentRepo = require('../../repositories/paymentRepository');
const {
  resolveOrderByPayment,
  getLatestTransaction,
  appendTimeline,
  auditTransition,
  shouldSkipFailure,
} = require('../handlerContext');

async function handleFailed({ parsed, webhookEvent, correlationId, eventSource, io, emitPaymentEvent }) {
  const order = await resolveOrderByPayment(parsed);
  if (!order) return { ok: true, skipped: true, reason: 'order_not_found' };
  if (shouldSkipFailure(order)) return { ok: true, skipped: true, reason: 'terminal_stage', orderId: order.id };

  await holdService.releaseActiveCreditHolds({
    orderId: order.id,
    correlationId,
    reason: parsed.entityStatus || 'failed',
    eventSource,
  });

  const transaction = await getLatestTransaction(order.id);
  if (transaction) {
    await paymentRepo.updateTransactionLifecycle(transaction.id, 'FAILED', {
      status: 'FAILED',
      correlationId,
      failureReason: parsed.payment?.error_description || 'payment_failed',
    });
  }

  const oldStage = order.lifecycle_stage;
  await paymentRepo.updateOrderLifecycle(order.id, 'FAILED', {
    status: 'FAILED',
    correlationId,
  });

  await appendTimeline({
    order,
    transaction,
    stage: 'FAILED',
    eventType: parsed.eventType,
    webhookEventId: webhookEvent.id,
    correlationId,
    details: { providerPaymentId: parsed.providerPaymentId },
  });

  await auditTransition({
    order,
    action: 'payment_failed',
    oldState: { lifecycleStage: oldStage },
    newState: { lifecycleStage: 'FAILED' },
    correlationId,
    metadata: { webhookEventId: webhookEvent.id },
  });

  if (emitPaymentEvent && io) {
    emitPaymentEvent(io, order.user_id, {
      orderUuid: order.order_uuid,
      status: 'FAILED',
      lifecycleStage: 'FAILED',
      source: eventSource,
    });
  }

  return { ok: true, orderId: order.id, lifecycleStage: 'FAILED' };
}

module.exports = { handleFailed };
