const logger = require('../../lib/logger');
const paymentEventRepo = require('../repositories/paymentEventRepository');
const { dispatchToSubscribers } = require('./eventSubscribers');

async function processOneEvent(event) {
  const claimed = await paymentEventRepo.markProcessing(event.id);
  if (!claimed) return { ok: true, skipped: true, eventId: event.id, reason: 'already_claimed' };
  try {
    const results = await dispatchToSubscribers(event);
    const failed = results.find((r) => r?.ok === false);
    if (failed) throw new Error(failed.reason || 'subscriber_failed');
    await paymentEventRepo.markCompleted(event.id);
    return { ok: true, eventId: event.id, results };
  } catch (err) {
    const nextRetry = (event.retry_count || 0) + 1;
    if (nextRetry >= (event.max_retries || 5)) {
      await paymentEventRepo.markDeadLetter(event.id, err.message);
      logger.error({ eventId: event.id, err: err.message }, 'payment_event_dead_letter');
      return { ok: false, deadLetter: true, eventId: event.id };
    }
    await paymentEventRepo.markFailed(event.id, err.message);
    return { ok: false, retry: true, eventId: event.id, error: err.message };
  }
}

async function runEventConsumerBatch({ limit = 20 } = {}) {
  const batch = await paymentEventRepo.claimPendingBatch(limit);
  const outcomes = [];
  for (const event of batch) {
    outcomes.push(await processOneEvent(event));
  }
  return { processed: outcomes.length, outcomes };
}

module.exports = { processOneEvent, runEventConsumerBatch };
