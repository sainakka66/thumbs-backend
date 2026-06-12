const { query, queryRows } = require('../../lib/db/safeQuery');

async function findByIdempotencyKey(idempotencyKey) {
  const rows = await queryRows(`SELECT * FROM payment_settlements WHERE idempotency_key = ? LIMIT 1`, [idempotencyKey]);
  return rows[0] || null;
}

async function findByOrderId(paymentOrderId) {
  const rows = await queryRows(
    `SELECT * FROM payment_settlements WHERE payment_order_id = ? ORDER BY id DESC LIMIT 1`,
    [paymentOrderId]
  );
  return rows[0] || null;
}

async function createSettlement({
  paymentOrderId,
  paymentTransactionId,
  amountPaise,
  correlationId,
  idempotencyKey,
}) {
  const [result] = await query(
    `INSERT INTO payment_settlements (
      payment_order_id, payment_transaction_id, amount_paise, settlement_status, correlation_id, idempotency_key
    ) VALUES (?, ?, ?, 'PENDING', ?, ?)`,
    [paymentOrderId, paymentTransactionId, amountPaise, correlationId || null, idempotencyKey]
  );
  const rows = await queryRows(`SELECT * FROM payment_settlements WHERE id = ?`, [result.insertId]);
  return rows[0];
}

async function updateSettlement(id, fields) {
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    sets.push(`${col} = ?`);
    params.push(v);
  }
  if (!sets.length) return null;
  params.push(id);
  await query(`UPDATE payment_settlements SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
  const rows = await queryRows(`SELECT * FROM payment_settlements WHERE id = ?`, [id]);
  return rows[0];
}

module.exports = { findByIdempotencyKey, findByOrderId, createSettlement, updateSettlement };
