const logger = require('../../lib/logger');
const { randomUuid } = require('../utils/crypto');
const paymentEventRepo = require('../repositories/paymentEventRepository');

const EVENT_TYPES = {
  PAYMENT_AUTHORIZED: 'PAYMENT_AUTHORIZED',
  PAYMENT_CAPTURED: 'PAYMENT_CAPTURED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_SETTLED: 'PAYMENT_SETTLED',
  REFUND_CREATED: 'REFUND_CREATED',
  REFUND_COMPLETED: 'REFUND_COMPLETED',
};

const WEBHOOK_TO_BUS = {
  'payment.authorized': EVENT_TYPES.PAYMENT_AUTHORIZED,
  'payment.captured': EVENT_TYPES.PAYMENT_CAPTURED,
  'payment.failed': EVENT_TYPES.PAYMENT_FAILED,
  'order.paid': EVENT_TYPES.PAYMENT_CAPTURED,
  'refund.created': EVENT_TYPES.REFUND_CREATED,
  'refund.processed': EVENT_TYPES.REFUND_COMPLETED,
  'refund.failed': 'REFUND_FAILED',
};

async function publish({
  eventType,
  aggregateType,
  aggregateId,
  paymentOrderId,
  paymentTransactionId,
  webhookEventId,
  payload,
  correlationId,
  idempotencyKey,
}) {
  const row = await paymentEventRepo.insertEvent({
    eventUuid: randomUuid(),
    eventType,
    aggregateType: aggregateType || 'payment_order',
    aggregateId,
    paymentOrderId,
    paymentTransactionId,
    webhookEventId,
    payload: payload || {},
    correlationId,
    idempotencyKey,
  });
  if (!row) {
    const existing = await paymentEventRepo.findByIdempotencyKey(idempotencyKey);
    return { published: false, duplicate: true, eventId: existing?.id };
  }
  logger.info({ eventType, eventId: row.id, correlationId }, 'payment_event_published');
  return { published: true, eventId: row.id, event: row };
}

async function publishFromWebhookDispatch({ eventType, ctx, handlerResult }) {
  const busType = WEBHOOK_TO_BUS[eventType];
  if (!busType || handlerResult?.skipped) return { published: false, reason: 'no_bus_mapping' };

  const orderId = handlerResult.orderId;
  if (!orderId && busType !== 'REFUND_FAILED') return { published: false, reason: 'no_order_id' };

  const providerPaymentId = ctx.parsed?.providerPaymentId || 'na';
  const providerRefundId = ctx.parsed?.providerRefundId || 'na';
  const webhookEventId = ctx.webhookEvent?.id;

  let idempotencyKey = `bus:${busType}:${orderId}:${webhookEventId || ctx.correlationId}`;
  if (busType === EVENT_TYPES.PAYMENT_CAPTURED) {
    idempotencyKey = `bus:PAYMENT_CAPTURED:${providerPaymentId}`;
  }
  if (busType === EVENT_TYPES.REFUND_CREATED || busType === EVENT_TYPES.REFUND_COMPLETED) {
    idempotencyKey = `bus:${busType}:${providerRefundId}`;
  }

  return publish({
    eventType: busType,
    aggregateId: orderId || 0,
    paymentOrderId: orderId,
    webhookEventId,
    payload: {
      orderId,
      handlerResult,
      parsed: {
        eventType: ctx.parsed?.eventType,
        providerPaymentId,
        providerRefundId,
        providerOrderId: ctx.parsed?.providerOrderId,
      },
    },
    correlationId: ctx.correlationId,
    idempotencyKey,
  });
}

module.exports = { EVENT_TYPES, WEBHOOK_TO_BUS, publish, publishFromWebhookDispatch };
