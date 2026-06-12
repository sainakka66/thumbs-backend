const { randomUuid } = require('../utils/crypto');
const { queryRows } = require('../../lib/db/safeQuery');
const reconciliationRepo = require('../repositories/reconciliationRepository');
const ledgerRepo = require('../repositories/ledgerRepository');
const settlementRepo = require('../repositories/settlementRepository');
const notificationRepo = require('../repositories/notificationRepository');
const paymentEventRepo = require('../repositories/paymentEventRepository');

async function detectMissingSettlements(runId) {
  const rows = await queryRows(
    `SELECT po.id, po.order_uuid, po.lifecycle_stage, po.captured_at
     FROM payment_orders po
     LEFT JOIN payment_settlements ps ON ps.payment_order_id = po.id AND ps.settlement_status = 'SETTLED'
     WHERE po.lifecycle_stage = 'CAPTURED'
       AND po.captured_at IS NOT NULL
       AND po.captured_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
       AND ps.id IS NULL
     LIMIT 200`
  );
  for (const row of rows) {
    await reconciliationRepo.insertResult({
      reconciliationRunId: runId,
      detectorType: 'MISSING_SETTLEMENT',
      severity: 'CRITICAL',
      paymentOrderId: row.id,
      details: { orderUuid: row.order_uuid, lifecycleStage: row.lifecycle_stage },
    });
  }
  return rows.length;
}

async function detectMissingLedger(runId) {
  const rows = await queryRows(
    `SELECT po.id, po.order_uuid FROM payment_orders po
     WHERE po.lifecycle_stage IN ('CAPTURED','PROCESSING','SETTLED')
       AND NOT EXISTS (SELECT 1 FROM ledger_entries le WHERE le.payment_order_id = po.id)
     LIMIT 200`
  );
  for (const row of rows) {
    await reconciliationRepo.insertResult({
      reconciliationRunId: runId,
      detectorType: 'MISSING_LEDGER',
      severity: 'WARN',
      paymentOrderId: row.id,
      details: { orderUuid: row.order_uuid },
    });
  }
  return rows.length;
}

async function detectMissingRefunds(runId) {
  const rows = await queryRows(
    `SELECT pr.id, pr.payment_transaction_id, po.id AS order_id
     FROM payment_refunds pr
     INNER JOIN payment_transactions pt ON pt.id = pr.payment_transaction_id
     INNER JOIN payment_orders po ON po.id = pt.payment_order_id
     WHERE pr.lifecycle_stage = 'PENDING'
       AND pr.created_at < DATE_SUB(NOW(), INTERVAL 1 HOUR)
     LIMIT 200`
  );
  for (const row of rows) {
    await reconciliationRepo.insertResult({
      reconciliationRunId: runId,
      detectorType: 'MISSING_REFUND',
      severity: 'WARN',
      paymentOrderId: row.order_id,
      paymentTransactionId: row.payment_transaction_id,
      details: { refundId: row.id },
    });
  }
  return rows.length;
}

async function detectOrphanPayments(runId) {
  const rows = await queryRows(
    `SELECT po.id, po.order_uuid, pt.provider_payment_id
     FROM payment_transactions pt
     INNER JOIN payment_orders po ON po.id = pt.payment_order_id
     WHERE pt.provider_payment_id IS NOT NULL
       AND po.lifecycle_stage = 'PENDING'
       AND pt.lifecycle_stage IN ('CAPTURED','SETTLED')
     LIMIT 200`
  );
  for (const row of rows) {
    await reconciliationRepo.insertResult({
      reconciliationRunId: runId,
      detectorType: 'ORPHAN_PAYMENT',
      severity: 'CRITICAL',
      paymentOrderId: row.id,
      providerPaymentId: row.provider_payment_id,
      details: { orderUuid: row.order_uuid },
    });
  }
  return rows.length;
}

async function detectDuplicateEvents(runId) {
  const rows = await queryRows(
    `SELECT idempotency_key, COUNT(*) AS cnt FROM payment_events
     GROUP BY idempotency_key HAVING cnt > 1 LIMIT 100`
  );
  for (const row of rows) {
    await reconciliationRepo.insertResult({
      reconciliationRunId: runId,
      detectorType: 'DUPLICATE_EVENT',
      severity: 'WARN',
      details: { idempotencyKey: row.idempotency_key, count: row.cnt },
    });
  }
  return rows.length;
}

async function runFullReconciliation({ triggerSource = 'CRON', paymentProvider = 'razorpay', actorUserId = null } = {}) {
  const run = await reconciliationRepo.createRun({
    runUuid: randomUuid(),
    paymentProvider,
    triggerSource,
  });

  if (triggerSource === 'CRON') {
    const unifiedAuditRepo = require('../repositories/unifiedAuditRepository');
    const { asSystemContext } = require('../lib/systemContext');
    const system = asSystemContext({ prefix: 'reconciliation' });
    await unifiedAuditRepo
      .logAudit({
        domain: 'payments',
        entityType: 'reconciliation_run',
        entityId: String(run.id),
        action: 'reconciliation_run_started',
        actorUserId: null,
        correlationId: system.correlationId,
        metadata: { triggerSource, roleSlug: system.roleSlug, actorUserId },
      })
      .catch(() => {});
  }

  const counts = {
    missingSettlement: await detectMissingSettlements(run.id),
    missingLedger: await detectMissingLedger(run.id),
    missingRefund: await detectMissingRefunds(run.id),
    orphanPayment: await detectOrphanPayments(run.id),
    duplicateEvent: await detectDuplicateEvents(run.id),
  };

  const totalFindings = Object.values(counts).reduce((a, b) => a + b, 0);
  const status = counts.missingSettlement > 0 || counts.orphanPayment > 0 ? 'CRITICAL' : totalFindings > 0 ? 'WARN' : 'OK';

  await reconciliationRepo.finishRun(run.id, {
    status: 'COMPLETED',
    summary: { counts, totalFindings, status },
  });

  const today = new Date().toISOString().slice(0, 10);
  const stats = await queryRows(
    `SELECT
       COUNT(*) AS total_payments,
       SUM(lifecycle_stage IN ('CAPTURED','PROCESSING','SETTLED')) AS successful_payments,
       SUM(lifecycle_stage = 'FAILED') AS failed_payments,
       SUM(lifecycle_stage = 'CAPTURED') AS pending_settlements
     FROM payment_orders WHERE DATE(created_at) = ?`,
    [today]
  );

  await reconciliationRepo.upsertDailySummary({
    summaryDate: today,
    paymentProvider,
    fields: {
      totalPayments: stats[0]?.total_payments || 0,
      successfulPayments: stats[0]?.successful_payments || 0,
      failedPayments: stats[0]?.failed_payments || 0,
      pendingSettlements: stats[0]?.pending_settlements || 0,
      refundCount: counts.missingRefund,
      orphanPayments: counts.orphanPayment,
      missingLedgerCount: counts.missingLedger,
      missingNotificationCount: 0,
      reconciliationStatus: status,
      details: counts,
    },
  });

  return { runId: run.id, counts, status };
}

async function answerChecklistForOrder(orderId) {
  const orderRows = await queryRows(`SELECT * FROM payment_orders WHERE id = ?`, [orderId]);
  const order = orderRows[0];
  if (!order) return null;

  const ledger = await ledgerRepo.listEntriesByOrderId(orderId);
  const settlement = await settlementRepo.findByOrderId(orderId);
  const notifications = await queryRows(
    `SELECT * FROM payment_notifications WHERE payment_order_id = ?`,
    [orderId]
  );
  const refunds = await queryRows(
    `SELECT * FROM payment_refunds pr
     INNER JOIN payment_transactions pt ON pt.id = pr.payment_transaction_id
     WHERE pt.payment_order_id = ?`,
    [orderId]
  );

  return {
    orderUuid: order.order_uuid,
    captured: ['CAPTURED', 'PROCESSING', 'SETTLED'].includes(order.lifecycle_stage),
    settled: order.lifecycle_stage === 'SETTLED' || settlement?.settlement_status === 'SETTLED',
    ledgerPosted: ledger.length > 0,
    refundsCompleted: refunds.filter((r) => r.lifecycle_stage === 'PROCESSED').length,
    notificationsDelivered: notifications.filter((n) => n.status === 'DELIVERED').length,
    lifecycleStage: order.lifecycle_stage,
  };
}

module.exports = {
  runFullReconciliation,
  answerChecklistForOrder,
  detectMissingSettlements,
  detectMissingLedger,
  detectMissingRefunds,
  detectOrphanPayments,
  detectDuplicateEvents,
};
