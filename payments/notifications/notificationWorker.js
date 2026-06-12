const logger = require('../../lib/logger');
const notificationRepo = require('../repositories/notificationRepository');
const templates = require('./templates');
const { deliverEmail } = require('./paymentEmailDelivery');

async function processOneNotification(row) {
  const started = new Date();
  const attemptNo = (row.retry_count || 0) + 1;
  await notificationRepo.insertAttempt({
    notificationQueueId: row.id,
    attemptNo,
    status: 'STARTED',
    startedAt: started,
  });

  try {
    const templateData =
      typeof row.template_data === 'string' ? JSON.parse(row.template_data) : row.template_data || {};
    const renderer = templates[row.template_key];
    if (!renderer) throw new Error(`Unknown template: ${row.template_key}`);
    const { subject, text, html } = renderer(templateData);

    const providerResult = await deliverEmail({ to: row.recipient, subject, text, html });

    await notificationRepo.updateNotification(row.id, {
      status: 'DELIVERED',
      sentAt: new Date(),
      deliveredAt: new Date(),
      providerResponse: providerResult,
    });
    await notificationRepo.insertAttempt({
      notificationQueueId: row.id,
      attemptNo,
      status: 'DELIVERED',
      providerMessageId: providerResult?.id || providerResult?.messageId || null,
      providerResponse: providerResult,
      startedAt: started,
      finishedAt: new Date(),
    });
    return { ok: true, notificationId: row.id };
  } catch (err) {
    const retry = attemptNo < (row.max_retries || 5);
    await notificationRepo.updateNotification(row.id, {
      status: retry ? 'PENDING' : 'FAILED',
      retryCount: attemptNo,
      failureReason: err.message?.slice(0, 512),
    });
    await notificationRepo.insertAttempt({
      notificationQueueId: row.id,
      attemptNo,
      status: 'FAILED',
      failureReason: err.message?.slice(0, 512),
      startedAt: started,
      finishedAt: new Date(),
    });
    logger.warn({ notificationId: row.id, err: err.message }, 'notification_send_failed');
    return { ok: false, notificationId: row.id, error: err.message };
  }
}

async function runNotificationBatch({ limit = 20 } = {}) {
  const batch = await notificationRepo.claimPendingBatch(limit);
  const outcomes = [];
  for (const row of batch) {
    outcomes.push(await processOneNotification(row));
  }
  return { processed: outcomes.length, outcomes };
}

module.exports = { processOneNotification, runNotificationBatch };
