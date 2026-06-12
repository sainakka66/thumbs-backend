const { query, queryRows } = require('../../lib/db/safeQuery');

async function findAccountByCode(code) {
  const rows = await queryRows(`SELECT * FROM ledger_accounts WHERE code = ? AND is_active = 1 LIMIT 1`, [code]);
  return rows[0] || null;
}

async function findEntryByIdempotencyKey(idempotencyKey) {
  if (!idempotencyKey) return null;
  const rows = await queryRows(`SELECT * FROM ledger_entries WHERE idempotency_key = ? LIMIT 1`, [idempotencyKey]);
  return rows[0] || null;
}

async function listEntriesByOrderId(paymentOrderId) {
  return queryRows(
    `SELECT * FROM ledger_entries WHERE payment_order_id = ? ORDER BY posted_at ASC, id ASC`,
    [paymentOrderId]
  );
}

async function listEntriesByJournalId(journalId) {
  return queryRows(`SELECT * FROM ledger_entries WHERE journal_id = ? ORDER BY id ASC`, [journalId]);
}

async function insertEntry({
  journalId,
  ledgerAccountId,
  ledgerAccountCode,
  entryType,
  amountPaise,
  currency = 'INR',
  paymentOrderId,
  paymentTransactionId,
  paymentHoldId,
  paymentRefundId,
  referenceType,
  referenceId,
  description,
  correlationId,
  idempotencyKey,
  metadata,
}) {
  const [result] = await query(
    `INSERT INTO ledger_entries (
      journal_id, ledger_account_id, ledger_account_code, entry_type, amount_paise, currency,
      payment_order_id, payment_transaction_id, payment_hold_id, payment_refund_id,
      reference_type, reference_id, description, correlation_id, idempotency_key, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      journalId,
      ledgerAccountId,
      ledgerAccountCode,
      entryType,
      amountPaise,
      currency,
      paymentOrderId || null,
      paymentTransactionId || null,
      paymentHoldId || null,
      paymentRefundId || null,
      referenceType,
      referenceId,
      description || null,
      correlationId || null,
      idempotencyKey || null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
  const rows = await queryRows(`SELECT * FROM ledger_entries WHERE id = ?`, [result.insertId]);
  return rows[0];
}

module.exports = {
  findAccountByCode,
  findEntryByIdempotencyKey,
  listEntriesByOrderId,
  listEntriesByJournalId,
  insertEntry,
};
