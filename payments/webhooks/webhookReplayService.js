const { NotFoundError, ValidationError } = require('../../lib/errors');
const webhookEventRepo = require('../repositories/webhookEventRepository');
const { ingestWebhook } = require('./webhookIngestService');

async function replayWebhookEvent({ webhookEventId, io, correlationId, emitPaymentEvent, force = false }) {
  const stored = await webhookEventRepo.findById(webhookEventId);
  if (!stored) throw new NotFoundError('Webhook event not found');

  let payload;
  try {
    payload = typeof stored.payload === 'string' ? JSON.parse(stored.payload) : stored.payload;
  } catch {
    throw new ValidationError('Stored webhook payload is invalid JSON');
  }

  const rawBody = Buffer.from(JSON.stringify(payload));
  const signature = stored.signature || '';

  return ingestWebhook({
    rawBody,
    signature,
    io,
    sourceIp: stored.source_ip,
    correlationId: correlationId || stored.correlation_id,
    emitPaymentEvent,
    isReplay: true,
    forceReprocess: force,
  });
}

module.exports = { replayWebhookEvent };
