const { query, queryRows } = require('../../lib/db/safeQuery');

async function enqueue({
  notificationUuid,
  notificationType,
  channel,
  recipient,
  templateKey,
  templateData,
  paymentOrderId,
  paymentEventId,
  correlationId,
  idempotencyKey,
}) {
  try {
    const [result] = await query(
      `INSERT INTO notification_queue (
        notification_uuid, notification_type, channel, recipient, template_key, template_data,
        payment_order_id, payment_event_id, status, correlation_id, idempotency_key
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
      [
        notificationUuid,
        notificationType,
        channel || 'EMAIL',
        recipient,
        templateKey,
        templateData ? JSON.stringify(templateData) : null,
        paymentOrderId || null,
        paymentEventId || null,
        correlationId || null,
        idempotencyKey,
      ]
    );
    const rows = await queryRows(`SELECT * FROM notification_queue WHERE id = ?`, [result.insertId]);
    return rows[0];
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return null;
    throw err;
  }
}

async function linkPaymentNotification({ paymentOrderId, notificationQueueId, notificationType, status }) {
  await query(
    `INSERT INTO payment_notifications (payment_order_id, notification_queue_id, notification_type, status)
     VALUES (?, ?, ?, ?)`,
    [paymentOrderId, notificationQueueId, notificationType, status || 'PENDING']
  );
}

async function claimPendingBatch(limit = 20) {
  return queryRows(
    `SELECT * FROM notification_queue
     WHERE status = 'PENDING' AND scheduled_at <= NOW() AND retry_count < max_retries
     ORDER BY scheduled_at ASC LIMIT ?`,
    [limit]
  );
}

async function updateNotification(id, fields) {
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    sets.push(`${col} = ?`);
    params.push(typeof v === 'object' && v !== null ? JSON.stringify(v) : v);
  }
  if (!sets.length) return null;
  params.push(id);
  await query(`UPDATE notification_queue SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
  const rows = await queryRows(`SELECT * FROM notification_queue WHERE id = ?`, [id]);
  return rows[0];
}

async function insertAttempt({
  notificationQueueId,
  attemptNo,
  status,
  provider,
  providerMessageId,
  providerResponse,
  failureReason,
  startedAt,
  finishedAt,
}) {
  const [result] = await query(
    `INSERT INTO notification_attempts (
      notification_queue_id, attempt_no, status, provider, provider_message_id,
      provider_response, failure_reason, started_at, finished_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      notificationQueueId,
      attemptNo,
      status,
      provider || 'resend',
      providerMessageId || null,
      providerResponse ? JSON.stringify(providerResponse) : null,
      failureReason || null,
      startedAt || new Date(),
      finishedAt || null,
    ]
  );
  const rows = await queryRows(`SELECT * FROM notification_attempts WHERE id = ?`, [result.insertId]);
  return rows[0];
}

async function findByIdempotencyKey(idempotencyKey) {
  const rows = await queryRows(`SELECT * FROM notification_queue WHERE idempotency_key = ? LIMIT 1`, [idempotencyKey]);
  return rows[0] || null;
}

module.exports = {
  enqueue,
  linkPaymentNotification,
  claimPendingBatch,
  updateNotification,
  insertAttempt,
  findByIdempotencyKey,
};
