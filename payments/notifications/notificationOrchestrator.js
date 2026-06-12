const { randomUuid } = require('../utils/crypto');
const notificationRepo = require('../repositories/notificationRepository');
const paymentRepo = require('../repositories/paymentRepository');
const { queryRows } = require('../../lib/db/safeQuery');
const { EVENT_TYPES } = require('../events/eventPublisher');
const templates = require('./templates');

const EVENT_TO_NOTIFICATION = {
  [EVENT_TYPES.PAYMENT_CAPTURED]: { type: 'PAYMENT_SUCCESS', template: 'paymentSuccess' },
  [EVENT_TYPES.PAYMENT_FAILED]: { type: 'PAYMENT_FAILED', template: 'paymentFailed' },
  [EVENT_TYPES.PAYMENT_SETTLED]: { type: 'PAYMENT_SETTLED', template: 'paymentSettled' },
  [EVENT_TYPES.REFUND_CREATED]: { type: 'REFUND_CREATED', template: 'refundCreated' },
  [EVENT_TYPES.REFUND_COMPLETED]: { type: 'REFUND_COMPLETED', template: 'refundCompleted' },
};

async function resolveRecipientEmail(orderId) {
  const rows = await queryRows(
    `SELECT u.email FROM payment_orders po
     INNER JOIN users u ON u.id = po.user_id
     WHERE po.id = ? LIMIT 1`,
    [orderId]
  );
  return rows[0]?.email || null;
}

async function enqueueFromPaymentEvent(event) {
  const mapping = EVENT_TO_NOTIFICATION[event.event_type];
  if (!mapping) return { skipped: true };

  const orderId = event.payment_order_id || event.payload?.orderId;
  if (!orderId) return { skipped: true, reason: 'no_order' };

  const order = await paymentRepo.findOrderById(orderId);
  if (!order) return { skipped: true, reason: 'order_not_found' };

  const recipient = await resolveRecipientEmail(orderId);
  if (!recipient) return { skipped: true, reason: 'no_recipient' };

  const templateData = {
    orderUuid: order.order_uuid,
    amountInr: Number(order.amount_inr),
  };
  const rendered = templates[mapping.template](templateData);
  const idempotencyKey = `notify:${mapping.type}:${orderId}:${event.id}`;

  const existing = await notificationRepo.findByIdempotencyKey(idempotencyKey);
  if (existing) return { duplicate: true, notificationId: existing.id };

  const row = await notificationRepo.enqueue({
    notificationUuid: randomUuid(),
    notificationType: mapping.type,
    channel: 'EMAIL',
    recipient,
    templateKey: mapping.template,
    templateData,
    paymentOrderId: orderId,
    paymentEventId: event.id,
    correlationId: event.correlation_id,
    idempotencyKey,
  });
  if (!row) return { duplicate: true };

  await notificationRepo.linkPaymentNotification({
    paymentOrderId: orderId,
    notificationQueueId: row.id,
    notificationType: mapping.type,
    status: 'PENDING',
  });

  return { enqueued: true, notificationId: row.id };
}

module.exports = { enqueueFromPaymentEvent, EVENT_TO_NOTIFICATION };
