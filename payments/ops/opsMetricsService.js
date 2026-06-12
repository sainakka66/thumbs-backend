const { queryRows } = require('../../lib/db/safeQuery');

async function safeCount(sql, params = []) {
  try {
    const rows = await queryRows(sql, params);
    return rows[0]?.cnt ?? 0;
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return null;
    throw err;
  }
}

async function getQueueMetrics() {
  const [eventsPending, eventsFailed, eventsDeadLetter, eventsProcessing] = await Promise.all([
    safeCount(`SELECT COUNT(*) AS cnt FROM payment_events WHERE consumer_status = 'PENDING'`),
    safeCount(`SELECT COUNT(*) AS cnt FROM payment_events WHERE consumer_status = 'FAILED'`),
    safeCount(`SELECT COUNT(*) AS cnt FROM payment_events WHERE consumer_status = 'DEAD_LETTER'`),
    safeCount(`SELECT COUNT(*) AS cnt FROM payment_events WHERE consumer_status = 'PROCESSING'`),
  ]);

  const [notificationsPending, notificationsFailed] = await Promise.all([
    safeCount(`SELECT COUNT(*) AS cnt FROM notification_queue WHERE status = 'PENDING'`),
    safeCount(`SELECT COUNT(*) AS cnt FROM notification_queue WHERE status = 'FAILED'`),
  ]);

  const [webhooksPending, webhooksFailed] = await Promise.all([
    safeCount(`SELECT COUNT(*) AS cnt FROM webhook_events WHERE processing_status IN ('PENDING','RECEIVED')`),
    safeCount(`SELECT COUNT(*) AS cnt FROM webhook_events WHERE processing_status = 'FAILED'`),
  ]);

  let lastReconciliation = null;
  try {
    const rows = await queryRows(
      `SELECT id, run_uuid, status, started_at, finished_at FROM reconciliation_runs ORDER BY started_at DESC LIMIT 1`
    );
    lastReconciliation = rows[0] || null;
  } catch (err) {
    if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
  }

  return {
    paymentEvents: {
      pending: eventsPending,
      failed: eventsFailed,
      deadLetter: eventsDeadLetter,
      processing: eventsProcessing,
    },
    notifications: {
      pending: notificationsPending,
      failed: notificationsFailed,
    },
    webhooks: {
      pending: webhooksPending,
      failed: webhooksFailed,
    },
    lastReconciliation,
    generatedAt: new Date().toISOString(),
  };
}

async function getHealthSnapshot() {
  const metrics = await getQueueMetrics();
  const alerts = [];

  if (metrics.paymentEvents?.deadLetter > 0) {
    alerts.push({ level: 'critical', code: 'PAYMENT_EVENTS_DEAD_LETTER', count: metrics.paymentEvents.deadLetter });
  }
  if (metrics.paymentEvents?.failed > 10) {
    alerts.push({ level: 'warn', code: 'PAYMENT_EVENTS_RETRY_BACKLOG', count: metrics.paymentEvents.failed });
  }
  if (metrics.notifications?.failed > 5) {
    alerts.push({ level: 'warn', code: 'NOTIFICATION_DELIVERY_FAILURES', count: metrics.notifications.failed });
  }
  if (metrics.webhooks?.failed > 0) {
    alerts.push({ level: 'warn', code: 'WEBHOOK_PROCESSING_FAILURES', count: metrics.webhooks.failed });
  }

  const healthy =
    alerts.filter((a) => a.level === 'critical').length === 0 &&
    (metrics.paymentEvents?.deadLetter ?? 0) === 0;

  return { healthy, alerts, metrics };
}

module.exports = { getQueueMetrics, getHealthSnapshot };
