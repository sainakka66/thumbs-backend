const { ValidationError, ConflictError } = require('../../lib/errors');
const paymentRepo = require('../repositories/paymentRepository');
const refundTimelineRepo = require('../repositories/refundTimelineRepository');
const unifiedAuditRepo = require('../repositories/unifiedAuditRepository');
const { queryRows } = require('../../lib/db/safeQuery');

async function sumRefundedPaise(paymentTransactionId) {
  const rows = await queryRows(
    `SELECT COALESCE(SUM(amount_paise), 0) AS total FROM payment_refunds
     WHERE payment_transaction_id = ? AND lifecycle_stage IN ('PENDING','PROCESSED','CREATED')`,
    [paymentTransactionId]
  );
  return rows[0]?.total || 0;
}

async function validatePartialRefund({ transaction, order, amountPaise }) {
  const already = await sumRefundedPaise(transaction.id);
  const remaining = order.amount_paise - already;
  if (amountPaise > remaining) {
    throw new ConflictError(`Refund exceeds remaining refundable amount (${remaining} paise)`);
  }
  return { alreadyRefunded: already, remaining, isPartial: amountPaise < order.amount_paise };
}

async function recordRefundCreated({
  order,
  transaction,
  refund,
  amountPaise,
  correlationId,
  eventSource,
  webhookEventId,
  isPartial,
}) {
  await refundTimelineRepo.append({
    paymentRefundId: refund.id,
    paymentOrderId: order.id,
    paymentTransactionId: transaction?.id,
    stage: 'CREATED',
    eventSource,
    eventType: 'refund.created',
    webhookEventId,
    correlationId,
    details: { amountPaise, isPartial },
  });
  await unifiedAuditRepo.logAudit({
    entityType: 'payment_refund',
    entityId: refund.id,
    action: 'refund_created',
    newState: { amountPaise, isPartial },
    correlationId,
  });
}

async function markRefundProcessed({ refund, order, transaction, correlationId, eventSource, webhookEventId }) {
  await paymentRepo.updateRefundLifecycle(refund.id, {
    lifecycleStage: 'PROCESSED',
    status: 'PROCESSED',
    processedAt: new Date(),
    correlationId,
  });
  await refundTimelineRepo.append({
    paymentRefundId: refund.id,
    paymentOrderId: order.id,
    paymentTransactionId: transaction?.id,
    stage: 'PROCESSED',
    eventSource,
    eventType: 'refund.processed',
    webhookEventId,
    correlationId,
  });
}

async function markRefundFailed({ refund, order, transaction, reason, correlationId, eventSource, webhookEventId }) {
  if (!refund) return null;
  await paymentRepo.updateRefundLifecycle(refund.id, {
    lifecycleStage: 'FAILED',
    status: 'FAILED',
    failedAt: new Date(),
    failureReason: reason?.slice(0, 512),
    correlationId,
  });
  await refundTimelineRepo.append({
    paymentRefundId: refund.id,
    paymentOrderId: order.id,
    paymentTransactionId: transaction?.id,
    stage: 'FAILED',
    eventSource,
    eventType: 'refund.failed',
    webhookEventId,
    correlationId,
    details: { reason },
  });
  await unifiedAuditRepo.logAudit({
    entityType: 'payment_refund',
    entityId: refund.id,
    action: 'refund_failed',
    newState: { reason },
    correlationId,
  });
  return refund;
}

module.exports = {
  sumRefundedPaise,
  validatePartialRefund,
  recordRefundCreated,
  markRefundProcessed,
  markRefundFailed,
};
