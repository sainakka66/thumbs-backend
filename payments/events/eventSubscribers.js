const settlementService = require('../settlement/settlementService');
const notificationOrchestrator = require('../notifications/notificationOrchestrator');
const { EVENT_TYPES } = require('./eventPublisher');

async function settlementSubscriber(event) {
  if (event.event_type !== EVENT_TYPES.PAYMENT_CAPTURED) return { skipped: true };
  const orderId = event.payment_order_id || event.payload?.orderId;
  if (!orderId) return { skipped: true, reason: 'no_order' };
  return settlementService.settleCapturedOrder({
    orderId,
    correlationId: event.correlation_id,
    paymentEventId: event.id,
  });
}

async function notificationSubscriber(event) {
  return notificationOrchestrator.enqueueFromPaymentEvent(event);
}

async function refundFailedSubscriber(event) {
  if (event.event_type !== 'REFUND_FAILED') return { skipped: true };
  return notificationOrchestrator.enqueueFromPaymentEvent(event);
}

const SUBSCRIBERS = {
  [EVENT_TYPES.PAYMENT_CAPTURED]: [settlementSubscriber, notificationSubscriber],
  [EVENT_TYPES.PAYMENT_FAILED]: [notificationSubscriber],
  [EVENT_TYPES.PAYMENT_SETTLED]: [notificationSubscriber],
  [EVENT_TYPES.REFUND_CREATED]: [notificationSubscriber],
  [EVENT_TYPES.REFUND_COMPLETED]: [notificationSubscriber],
  REFUND_FAILED: [refundFailedSubscriber],
};

async function dispatchToSubscribers(event) {
  const handlers = SUBSCRIBERS[event.event_type] || [];
  const results = [];
  for (const handler of handlers) {
    results.push(await handler(event));
  }
  return results;
}

module.exports = { SUBSCRIBERS, dispatchToSubscribers, settlementSubscriber, notificationSubscriber };
