require('dotenv').config();
const { runNotificationBatch } = require('../payments/notifications/notificationWorker');
const unifiedAuditRepo = require('../payments/repositories/unifiedAuditRepository');
const { asSystemContext } = require('../payments/lib/systemContext');

async function main() {
  const system = asSystemContext({ prefix: 'notification-worker' });
  const result = await runNotificationBatch({ limit: parseInt(process.env.NOTIFICATION_BATCH || '20', 10) });
  await unifiedAuditRepo.logAudit({
    domain: 'payments',
    entityType: 'worker',
    entityId: 'notifications',
    action: 'worker_batch_completed',
    correlationId: system.correlationId,
    metadata: { roleSlug: system.roleSlug, processed: result.processed },
  }).catch(() => {});
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
