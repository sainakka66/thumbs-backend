const { query, queryRows } = require('../../lib/db/safeQuery');

async function appendTimeline({
  paymentOrderId,
  paymentTransactionId,
  stage,
  eventSource,
  eventType,
  webhookEventId,
  paymentEventId,
  correlationId,
  actorUserId,
  details,
}) {
  const [result] = await query(
    `INSERT INTO payment_timeline (
      payment_order_id, payment_transaction_id, stage, event_source, event_type,
      webhook_event_id, payment_event_id, correlation_id, actor_user_id, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      paymentOrderId,
      paymentTransactionId || null,
      stage,
      eventSource,
      eventType || null,
      webhookEventId || null,
      paymentEventId || null,
      correlationId || null,
      actorUserId || null,
      details ? JSON.stringify(details) : null,
    ]
  );
  const rows = await queryRows(`SELECT * FROM payment_timeline WHERE id = ?`, [result.insertId]);
  return rows[0];
}

async function listByOrderId(paymentOrderId) {
  return queryRows(
    `SELECT * FROM payment_timeline WHERE payment_order_id = ? ORDER BY created_at ASC, id ASC`,
    [paymentOrderId]
  );
}

async function listByOrderUuid(orderUuid) {
  return queryRows(
    `SELECT pt.* FROM payment_timeline pt
     INNER JOIN payment_orders po ON po.id = pt.payment_order_id
     WHERE po.order_uuid = ?
     ORDER BY pt.created_at ASC, pt.id ASC`,
    [orderUuid]
  );
}

module.exports = { appendTimeline, listByOrderId, listByOrderUuid };
