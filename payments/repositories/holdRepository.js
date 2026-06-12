const { query, queryRows } = require('../../lib/db/safeQuery');

async function findById(id) {
  const rows = await queryRows(`SELECT * FROM payment_holds WHERE id = ? LIMIT 1`, [id]);
  return rows[0] || null;
}

async function findByIdempotencyKey(idempotencyKey) {
  if (!idempotencyKey) return null;
  const rows = await queryRows(`SELECT * FROM payment_holds WHERE idempotency_key = ? LIMIT 1`, [idempotencyKey]);
  return rows[0] || null;
}

async function findActiveHold({ paymentOrderId, holdType, ledgerAccountCode }) {
  const rows = await queryRows(
    `SELECT * FROM payment_holds
     WHERE payment_order_id = ? AND hold_type = ? AND ledger_account_code = ?
       AND status = 'ACTIVE' AND hold_phase IN ('HOLD','INQUIRE')
     ORDER BY id DESC LIMIT 1`,
    [paymentOrderId, holdType, ledgerAccountCode]
  );
  return rows[0] || null;
}

async function createHold({
  holdUuid,
  paymentOrderId,
  paymentTransactionId,
  holdType,
  holdPhase,
  ledgerAccountCode,
  amountPaise,
  currency = 'INR',
  idempotencyKey,
  correlationId,
  metadata,
  expiresAt,
}) {
  const [result] = await query(
    `INSERT INTO payment_holds (
      hold_uuid, payment_order_id, payment_transaction_id, hold_type, hold_phase,
      ledger_account_code, amount_paise, currency, status, idempotency_key, correlation_id, metadata, expires_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?, ?, ?, ?)`,
    [
      holdUuid,
      paymentOrderId,
      paymentTransactionId || null,
      holdType,
      holdPhase,
      ledgerAccountCode,
      amountPaise,
      currency,
      idempotencyKey || null,
      correlationId || null,
      metadata ? JSON.stringify(metadata) : null,
      expiresAt || null,
    ]
  );
  const rows = await queryRows(`SELECT * FROM payment_holds WHERE id = ?`, [result.insertId]);
  return rows[0];
}

async function updateHold(id, fields) {
  const sets = [];
  const params = [];
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    sets.push(`${col} = ?`);
    params.push(value);
  }
  if (!sets.length) return null;
  params.push(id);
  await query(`UPDATE payment_holds SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
  const rows = await queryRows(`SELECT * FROM payment_holds WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function listByOrderId(paymentOrderId) {
  return queryRows(`SELECT * FROM payment_holds WHERE payment_order_id = ? ORDER BY created_at ASC`, [paymentOrderId]);
}

module.exports = {
  findById,
  findByIdempotencyKey,
  findActiveHold,
  createHold,
  updateHold,
  listByOrderId,
};
