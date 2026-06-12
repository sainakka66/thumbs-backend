const holdService = require('../../ledger/holdService');
const balanceService = require('../../ledger/balanceService');
const paymentRepo = require('../../repositories/paymentRepository');
const {
  resolveOrderByPayment,
  getLatestTransaction,
  appendTimeline,
  auditTransition,
  shouldSkipCapture,
} = require('../handlerContext');

async function handleAuthorized({ parsed, webhookEvent, correlationId, eventSource }) {
  const order = await resolveOrderByPayment(parsed);
  if (!order) return { ok: true, skipped: true, reason: 'order_not_found' };
  if (shouldSkipCapture(order)) return { ok: true, skipped: true, reason: 'already_advanced' };

  const transaction = await getLatestTransaction(order.id);
  const amountPaise = parsed.amountPaise || order.amount_paise;

  await balanceService.initializeForOrder(order);
  await holdService.creditInquire({ order, amountPaise, correlationId, eventSource });
  await holdService.creditHold({
    order,
    paymentTransactionId: transaction?.id,
    amountPaise,
    correlationId,
    idempotencyKey: `credit-hold:${webhookEvent.id}:${order.id}`,
    eventSource,
    webhookEventId: webhookEvent.id,
  });

  const oldStage = order.lifecycle_stage;
  await paymentRepo.updateOrderLifecycle(order.id, 'AUTHORIZED', {
    status: order.status === 'CREATED' || order.status === 'INITIATED' ? 'PROCESSING' : order.status,
    correlationId,
    authorizedAt: new Date(),
  });
  await paymentRepo.updateOrderLifecycle(order.id, 'RESERVED', { correlationId });

  await appendTimeline({
    order,
    transaction,
    stage: 'AUTHORIZED',
    eventType: parsed.eventType,
    webhookEventId: webhookEvent.id,
    correlationId,
    details: { providerPaymentId: parsed.providerPaymentId },
  });

  await auditTransition({
    order,
    action: 'payment_authorized',
    oldState: { lifecycleStage: oldStage },
    newState: { lifecycleStage: 'RESERVED' },
    correlationId,
    metadata: { webhookEventId: webhookEvent.id, providerEventId: parsed.providerEventId },
  });

  return { ok: true, orderId: order.id, lifecycleStage: 'RESERVED' };
}

module.exports = { handleAuthorized };
