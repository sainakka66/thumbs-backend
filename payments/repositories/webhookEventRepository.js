const { query, queryRows } = require('../../lib/db/safeQuery');

async function findByProviderEventId(paymentProvider, providerEventId) {
  const rows = await queryRows(
    `SELECT * FROM webhook_events WHERE payment_provider = ? AND provider_event_id = ? LIMIT 1`,
    [paymentProvider, providerEventId]
  );
  return rows[0] || null;
}

async function findByPayloadHash(payloadHash) {
  const rows = await queryRows(`SELECT * FROM webhook_events WHERE payload_hash = ? LIMIT 1`, [payloadHash]);
  return rows[0] || null;
}

async function findById(id) {
  const rows = await queryRows(`SELECT * FROM webhook_events WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function insertWebhookEvent({
  webhookUuid,
  paymentProvider,
  providerEventId,
  eventType,
  providerOrderId,
  providerPaymentId,
  providerRefundId,
  payload,
  payloadHash,
  signature,
  signatureValid,
  correlationId,
  sourceIp,
}) {
  try {
    const [result] = await query(
      `INSERT INTO webhook_events (
        webhook_uuid, payment_provider, provider_event_id, event_type,
        provider_order_id, provider_payment_id, provider_refund_id,
        payload, payload_hash, signature, signature_valid, processing_status, correlation_id, source_ip
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'RECEIVED', ?, ?)`,
      [
        webhookUuid,
        paymentProvider,
        providerEventId,
        eventType,
        providerOrderId || null,
        providerPaymentId || null,
        providerRefundId || null,
        JSON.stringify(payload),
        payloadHash,
        signature || null,
        signatureValid ? 1 : 0,
        correlationId || null,
        sourceIp || null,
      ]
    );
    return findById(result.insertId);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return null;
    throw err;
  }
}

async function updateWebhookEvent(id, fields) {
  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    sets.push(`${col} = ?`);
    params.push(value);
  }
  if (!sets.length) return findById(id);
  params.push(id);
  await query(`UPDATE webhook_events SET ${sets.join(', ')} WHERE id = ?`, params);
  return findById(id);
}

async function insertProcessingAttempt({ webhookEventId, attemptNo, status, errorMessage, durationMs, startedAt, finishedAt }) {
  const [result] = await query(
    `INSERT INTO webhook_processing_attempts (webhook_event_id, attempt_no, status, error_message, duration_ms, started_at, finished_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      webhookEventId,
      attemptNo,
      status,
      errorMessage || null,
      durationMs || null,
      startedAt || new Date(),
      finishedAt || null,
    ]
  );
  const rows = await queryRows(`SELECT * FROM webhook_processing_attempts WHERE id = ?`, [result.insertId]);
  return rows[0];
}

async function listRecent(limit = 100) {
  return queryRows(
    `SELECT id, webhook_uuid, event_type, provider_event_id, processing_status, retry_count, received_at, processed_at
     FROM webhook_events ORDER BY received_at DESC LIMIT ?`,
    [Math.min(limit, 200)]
  );
}

module.exports = {
  findByProviderEventId,
  findByPayloadHash,
  findById,
  insertWebhookEvent,
  updateWebhookEvent,
  insertProcessingAttempt,
  listRecent,
};
