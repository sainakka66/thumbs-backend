const { query, queryRows } = require('../../lib/db/safeQuery');

async function append({
  paymentRefundId,
  paymentOrderId,
  paymentTransactionId,
  stage,
  eventSource,
  eventType,
  webhookEventId,
  paymentEventId,
  correlationId,
  details,
}) {
  const [result] = await query(
    `INSERT INTO refund_timeline (
      payment_refund_id, payment_order_id, payment_transaction_id, stage, event_source,
      event_type, webhook_event_id, payment_event_id, correlation_id, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      paymentRefundId,
      paymentOrderId,
      paymentTransactionId || null,
      stage,
      eventSource,
      eventType || null,
      webhookEventId || null,
      paymentEventId || null,
      correlationId || null,
      details ? JSON.stringify(details) : null,
    ]
  );
  const rows = await queryRows(`SELECT * FROM refund_timeline WHERE id = ?`, [result.insertId]);
  return rows[0];
}

async function listByRefundId(paymentRefundId) {
  return queryRows(`SELECT * FROM refund_timeline WHERE payment_refund_id = ? ORDER BY created_at ASC`, [
    paymentRefundId,
  ]);
}

module.exports = { append, listByRefundId };
