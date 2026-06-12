const holdService = require('../../ledger/holdService');
const holdRepo = require('../../repositories/holdRepository');
const paymentRepo = require('../../repositories/paymentRepository');
const refundService = require('../../refunds/refundService');
const { ACCOUNT_CODES } = require('../../ledger/journalService');
const { resolveOrderByPayment, getLatestTransaction } = require('../handlerContext');

async function handleRefundFailed({ parsed, webhookEvent, correlationId, eventSource }) {
  const order = await resolveOrderByPayment(parsed);
  if (!order) return { ok: true, skipped: true, reason: 'order_not_found' };

  const transaction = await getLatestTransaction(order.id);
  let refund = null;
  if (parsed.providerRefundId) {
    refund = await paymentRepo.findRefundByProviderRefundId(parsed.provider, parsed.providerRefundId);
  }

  const activeDebitHold = await holdRepo.findActiveHold({
    paymentOrderId: order.id,
    holdType: 'DEBIT',
    ledgerAccountCode: ACCOUNT_CODES.REFUND,
  });
  if (activeDebitHold) {
    await holdRepo.updateHold(activeDebitHold.id, {
      holdPhase: 'RELEASE',
      status: 'RELEASED',
      releasedAt: new Date(),
    });
  }

  if (refund) {
    await refundService.markRefundFailed({
      refund,
      order,
      transaction,
      reason: parsed.refund?.error_description || 'refund_failed',
      correlationId,
      eventSource,
      webhookEventId: webhookEvent.id,
    });
  }

  return { ok: true, orderId: order.id, refundId: refund?.id || null, lifecycleStage: order.lifecycle_stage };
}

module.exports = { handleRefundFailed };
