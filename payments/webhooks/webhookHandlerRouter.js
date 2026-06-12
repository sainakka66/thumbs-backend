const { handleAuthorized } = require('./handlers/authorizedHandler');
const { handleCaptured } = require('./handlers/capturedHandler');
const { handleFailed } = require('./handlers/failedHandler');
const { handleOrderPaid } = require('./handlers/orderPaidHandler');
const { handleRefundCreated } = require('./handlers/refundCreatedHandler');
const { handleRefundProcessed } = require('./handlers/refundProcessedHandler');
const { handleRefundFailed } = require('./handlers/refundFailedHandler');
const eventPublisher = require('../events/eventPublisher');
const logger = require('../../lib/logger');

const ROUTES = {
  'payment.authorized': handleAuthorized,
  'payment.captured': handleCaptured,
  'payment.failed': handleFailed,
  'order.paid': handleOrderPaid,
  'refund.created': handleRefundCreated,
  'refund.processed': handleRefundProcessed,
  'refund.failed': handleRefundFailed,
};

async function dispatch(eventType, ctx) {
  const handler = ROUTES[eventType];
  if (!handler) {
    return { ok: true, skipped: true, reason: 'unsupported_event', eventType };
  }
  const result = await handler(ctx);
  if (result?.ok !== false) {
    try {
      await eventPublisher.publishFromWebhookDispatch({ eventType, ctx, handlerResult: result });
    } catch (err) {
      logger.warn({ err: err.message, eventType }, 'event_publish_after_webhook_failed');
    }
  }
  return result;
}

function supportedEvents() {
  return Object.keys(ROUTES);
}

module.exports = { dispatch, supportedEvents, ROUTES };
