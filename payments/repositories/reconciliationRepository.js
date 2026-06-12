const { query, queryRows } = require('../../lib/db/safeQuery');

async function createRun({ runUuid, paymentProvider, triggerSource }) {
  const [result] = await query(
    `INSERT INTO reconciliation_runs (run_uuid, payment_provider, trigger_source, status)
     VALUES (?, ?, ?, 'RUNNING')`,
    [runUuid, paymentProvider || 'razorpay', triggerSource || 'CRON']
  );
  const rows = await queryRows(`SELECT * FROM reconciliation_runs WHERE id = ?`, [result.insertId]);
  return rows[0];
}

async function finishRun(id, { status, summary }) {
  await query(`UPDATE reconciliation_runs SET status = ?, finished_at = NOW(), summary = ? WHERE id = ?`, [
    status,
    summary ? JSON.stringify(summary) : null,
    id,
  ]);
  const rows = await queryRows(`SELECT * FROM reconciliation_runs WHERE id = ?`, [id]);
  return rows[0];
}

async function insertResult({
  reconciliationRunId,
  detectorType,
  severity,
  paymentOrderId,
  paymentTransactionId,
  webhookEventId,
  providerPaymentId,
  details,
}) {
  const [result] = await query(
    `INSERT INTO reconciliation_results (
      reconciliation_run_id, detector_type, severity, payment_order_id, payment_transaction_id,
      webhook_event_id, provider_payment_id, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      reconciliationRunId,
      detectorType,
      severity || 'WARN',
      paymentOrderId || null,
      paymentTransactionId || null,
      webhookEventId || null,
      providerPaymentId || null,
      details ? JSON.stringify(details) : null,
    ]
  );
  return result.insertId;
}

async function upsertDailySummary({ summaryDate, paymentProvider, fields }) {
  await query(
    `INSERT INTO reconciliation_summary (
      summary_date, payment_provider, total_payments, successful_payments, failed_payments,
      pending_settlements, refund_count, orphan_payments, missing_ledger_count,
      missing_notification_count, reconciliation_status, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      total_payments = VALUES(total_payments),
      successful_payments = VALUES(successful_payments),
      failed_payments = VALUES(failed_payments),
      pending_settlements = VALUES(pending_settlements),
      refund_count = VALUES(refund_count),
      orphan_payments = VALUES(orphan_payments),
      missing_ledger_count = VALUES(missing_ledger_count),
      missing_notification_count = VALUES(missing_notification_count),
      reconciliation_status = VALUES(reconciliation_status),
      details = VALUES(details),
      generated_at = NOW()`,
    [
      summaryDate,
      paymentProvider || 'razorpay',
      fields.totalPayments || 0,
      fields.successfulPayments || 0,
      fields.failedPayments || 0,
      fields.pendingSettlements || 0,
      fields.refundCount || 0,
      fields.orphanPayments || 0,
      fields.missingLedgerCount || 0,
      fields.missingNotificationCount || 0,
      fields.reconciliationStatus || 'OK',
      fields.details ? JSON.stringify(fields.details) : null,
    ]
  );
}

async function listRecentRuns(limit = 20) {
  return queryRows(`SELECT * FROM reconciliation_runs ORDER BY started_at DESC LIMIT ?`, [limit]);
}

async function listResultsByRun(runId) {
  return queryRows(`SELECT * FROM reconciliation_results WHERE reconciliation_run_id = ? ORDER BY id ASC`, [runId]);
}

module.exports = {
  createRun,
  finishRun,
  insertResult,
  upsertDailySummary,
  listRecentRuns,
  listResultsByRun,
};
