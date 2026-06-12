const { query, queryRows } = require('../../lib/db/safeQuery');

async function getByOrderId(paymentOrderId) {
  const rows = await queryRows(`SELECT * FROM payment_order_balances WHERE payment_order_id = ? LIMIT 1`, [
    paymentOrderId,
  ]);
  return rows[0] || null;
}

async function ensureBalanceRow(paymentOrderId, initialAvailablePaise = 0) {
  const existing = await getByOrderId(paymentOrderId);
  if (existing) return existing;
  await query(
    `INSERT INTO payment_order_balances (payment_order_id, available_balance_paise, held_balance_paise, settled_balance_paise)
     VALUES (?, ?, 0, 0)`,
    [paymentOrderId, initialAvailablePaise]
  );
  return getByOrderId(paymentOrderId);
}

async function updateBalances(paymentOrderId, { availablePaise, heldPaise, settledPaise }) {
  const sets = [];
  const params = [];
  if (availablePaise != null) {
    sets.push('available_balance_paise = ?');
    params.push(availablePaise);
  }
  if (heldPaise != null) {
    sets.push('held_balance_paise = ?');
    params.push(heldPaise);
  }
  if (settledPaise != null) {
    sets.push('settled_balance_paise = ?');
    params.push(settledPaise);
  }
  if (!sets.length) return getByOrderId(paymentOrderId);
  params.push(paymentOrderId);
  await query(`UPDATE payment_order_balances SET ${sets.join(', ')} WHERE payment_order_id = ?`, params);
  return getByOrderId(paymentOrderId);
}

module.exports = { getByOrderId, ensureBalanceRow, updateBalances };
