const { query, queryRows } = require('../../lib/db/safeQuery');

async function insertEvent({
  eventUuid,
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
  try {
    const [result] = await query(
      `INSERT INTO payment_events (
        event_uuid, event_type, aggregate_type, aggregate_id,
        payment_order_id, payment_transaction_id, webhook_event_id,
        payload, correlation_id, idempotency_key, consumer_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
      [
        eventUuid,
        eventType,
        aggregateType,
        aggregateId,
        paymentOrderId || null,
        paymentTransactionId || null,
        webhookEventId || null,
        JSON.stringify(payload),
        correlationId || null,
        idempotencyKey,
      ]
    );
    const rows = await queryRows(`SELECT * FROM payment_events WHERE id = ?`, [result.insertId]);
    return rows[0];
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return null;
    throw err;
  }
}

async function findByIdempotencyKey(idempotencyKey) {
  const rows = await queryRows(`SELECT * FROM payment_events WHERE idempotency_key = ? LIMIT 1`, [idempotencyKey]);
  return rows[0] || null;
}

async function claimPendingBatch(limit = 20) {
  const rows = await queryRows(
    `SELECT * FROM payment_events
     WHERE consumer_status IN ('PENDING','FAILED')
       AND (next_retry_at IS NULL OR next_retry_at <= NOW())
       AND retry_count < max_retries
     ORDER BY published_at ASC
     LIMIT ?`,
    [limit]
  );
  return rows;
}

async function markProcessing(id) {
  const [result] = await query(
    `UPDATE payment_events SET consumer_status = 'PROCESSING' WHERE id = ? AND consumer_status IN ('PENDING','FAILED')`,
    [id]
  );
  return (result?.affectedRows || 0) > 0;
}

async function markCompleted(id) {
  await query(
    `UPDATE payment_events SET consumer_status = 'COMPLETED', consumed_at = NOW(), last_error = NULL WHERE id = ?`,
    [id]
  );
}

async function markFailed(id, errorMessage, retryDelayMinutes = 5) {
  await query(
    `UPDATE payment_events
     SET consumer_status = 'FAILED',
         retry_count = retry_count + 1,
         last_error = ?,
         next_retry_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
     WHERE id = ?`,
    [errorMessage?.slice(0, 512) || 'unknown', retryDelayMinutes, id]
  );
}

async function markDeadLetter(id, errorMessage) {
  await query(
    `UPDATE payment_events SET consumer_status = 'DEAD_LETTER', last_error = ?, consumed_at = NOW() WHERE id = ?`,
    [errorMessage?.slice(0, 512) || 'max_retries', id]
  );
}

async function listDeadLetter(limit = 50) {
  return queryRows(
    `SELECT * FROM payment_events WHERE consumer_status = 'DEAD_LETTER' ORDER BY published_at DESC LIMIT ?`,
    [limit]
  );
}

async function requeueDeadLetter(id) {
  const [result] = await query(
    `UPDATE payment_events
     SET consumer_status = 'PENDING', retry_count = 0, next_retry_at = NULL, last_error = NULL
     WHERE id = ? AND consumer_status = 'DEAD_LETTER'`,
    [id]
  );
  return (result?.affectedRows || 0) > 0;
}

module.exports = {
  insertEvent,
  findByIdempotencyKey,
  claimPendingBatch,
  markProcessing,
  markCompleted,
  markFailed,
  markDeadLetter,
  listDeadLetter,
  requeueDeadLetter,
};
