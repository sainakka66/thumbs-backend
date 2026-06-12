const { withTransaction } = require('../../lib/db/safeQuery');
const paymentRepo = require('../repositories/paymentRepository');
const settlementRepo = require('../repositories/settlementRepository');
const timelineRepo = require('../repositories/timelineRepository');
const unifiedAuditRepo = require('../repositories/unifiedAuditRepository');
const balanceService = require('../ledger/balanceService');
const journalService = require('../ledger/journalService');
const eventPublisher = require('../events/eventPublisher');

async function settleCapturedOrder({ orderId, correlationId, paymentEventId, eventSource = 'EVENT_BUS' }) {
  const order = await paymentRepo.findOrderById(orderId);
  if (!order) return { ok: false, reason: 'order_not_found' };
  if (order.lifecycle_stage === 'SETTLED') return { ok: true, duplicate: true, lifecycleStage: 'SETTLED' };
  if (!['CAPTURED', 'PROCESSING'].includes(order.lifecycle_stage)) {
    return { ok: true, skipped: true, reason: 'not_ready', lifecycleStage: order.lifecycle_stage };
  }

  const transaction = await paymentRepo.getLatestTransaction(order.id);
  if (!transaction) return { ok: false, reason: 'transaction_missing' };

  const idempotencyKey = `settle:${order.id}`;
  const existingSettlement = await settlementRepo.findByIdempotencyKey(idempotencyKey);
  if (existingSettlement?.settlement_status === 'SETTLED') {
    return { ok: true, duplicate: true };
  }

  let settlement = existingSettlement;
  if (!settlement) {
    settlement = await settlementRepo.createSettlement({
      paymentOrderId: order.id,
      paymentTransactionId: transaction.id,
      amountPaise: order.amount_paise,
      correlationId,
      idempotencyKey,
    });
  }

  await paymentRepo.updateOrderLifecycle(order.id, 'PROCESSING', { correlationId });
  await settlementRepo.updateSettlement(settlement.id, { settlementStatus: 'PROCESSING' });

  await journalService.postSettlementJournal({
    paymentOrderId: order.id,
    paymentTransactionId: transaction.id,
    amountPaise: order.amount_paise,
    orderId: order.id,
    correlationId,
  });

  await balanceService.moveHeldToSettled({
    orderId: order.id,
    amountPaise: order.amount_paise,
    correlationId,
  });

  await withTransaction(async ({ query: txQuery }) => {
    await txQuery(`UPDATE payment_orders SET lifecycle_stage = 'SETTLED', status = 'SUCCESS', settled_at = NOW() WHERE id = ?`, [
      order.id,
    ]);
    await txQuery(
      `UPDATE payment_transactions SET lifecycle_stage = 'SETTLED', status = 'SUCCESS', settled_at = NOW() WHERE id = ?`,
      [transaction.id]
    );
    if (order.customer_id && order.amount_inr) {
      await txQuery(
        `UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance - ?) WHERE id = ?`,
        [order.amount_inr, order.customer_id]
      );
    }
    await txQuery(`UPDATE payment_settlements SET settlement_status = 'SETTLED', settled_at = NOW() WHERE id = ?`, [
      settlement.id,
    ]);
  });

  await timelineRepo.appendTimeline({
    paymentOrderId: order.id,
    paymentTransactionId: transaction.id,
    stage: 'SETTLED',
    eventSource,
    eventType: 'settlement.completed',
    paymentEventId,
    correlationId,
    details: { settlementId: settlement.id },
  });

  await unifiedAuditRepo.logAudit({
    entityType: 'payment_order',
    entityId: order.id,
    action: 'payment_settled',
    newState: { lifecycleStage: 'SETTLED', settlementId: settlement.id },
    correlationId,
  });

  await eventPublisher.publish({
    eventType: eventPublisher.EVENT_TYPES.PAYMENT_SETTLED,
    aggregateType: 'payment_order',
    aggregateId: order.id,
    paymentOrderId: order.id,
    paymentTransactionId: transaction.id,
    payload: { orderId: order.id, orderUuid: order.order_uuid, amountPaise: order.amount_paise },
    correlationId,
    idempotencyKey: `bus:PAYMENT_SETTLED:${order.id}`,
  });

  return { ok: true, lifecycleStage: 'SETTLED', settlementId: settlement.id };
}

module.exports = { settleCapturedOrder };
