const logger = require('../../lib/logger');
const razorpayService = require('../services/razorpayService');
const webhookEventRepo = require('../repositories/webhookEventRepository');
const { parseRazorpayWebhook, PROVIDER } = require('../providers/razorpay/RazorpayWebhookParser');
const { sha256, randomUuid } = require('../utils/crypto');
const { recordSecurityIncident } = require('../repositories/securityRepository');
const webhookHandlerRouter = require('./webhookHandlerRouter');

function isLedgerSchemaError(err) {
  return err?.code === 'ER_NO_SUCH_TABLE' || err?.code === 'ER_BAD_FIELD_ERROR';
}

async function ingestWebhook({
  rawBody,
  signature,
  io,
  sourceIp,
  correlationId,
  emitPaymentEvent,
  isReplay = false,
  forceReprocess = false,
}) {
  const started = Date.now();
  let payload;
  try {
    payload = JSON.parse(rawBody.toString());
  } catch (err) {
    return { ok: false, reason: 'invalid_json', error: err.message };
  }

  const payloadHash = sha256(rawBody.toString());
  const parsed = parseRazorpayWebhook(payload, payloadHash);
  const eventSource = isReplay ? 'REPLAY' : 'WEBHOOK';

  const signatureValid = isReplay ? true : razorpayService.verifyWebhookSignature(rawBody, signature);
  if (!signatureValid) {
    await recordSecurityIncident({
      incidentType: 'webhook_invalid_signature',
      severity: 'critical',
      details: { eventType: parsed.eventType, providerEventId: parsed.providerEventId },
      ipAddress: sourceIp,
    }).catch(() => {});
    logger.warn({ eventType: parsed.eventType, correlationId }, 'webhook_invalid_signature');
    return { ok: false, reason: 'invalid_signature' };
  }

  const existingByEvent = await webhookEventRepo.findByProviderEventId(PROVIDER, parsed.providerEventId);
  if (existingByEvent && !isReplay && !forceReprocess) {
    return { ok: true, duplicate: true, webhookEventId: existingByEvent.id, reason: 'provider_event_id' };
  }

  const existingByHash = await webhookEventRepo.findByPayloadHash(payloadHash);
  if (existingByHash && !isReplay && !forceReprocess) {
    return { ok: true, duplicate: true, webhookEventId: existingByHash.id, reason: 'payload_hash' };
  }

  let webhookEvent = null;
  if ((isReplay || forceReprocess) && existingByEvent) {
    webhookEvent = await webhookEventRepo.updateWebhookEvent(existingByEvent.id, {
      processingStatus: 'REPLAYED',
      retryCount: (existingByEvent.retry_count || 0) + 1,
      correlationId: correlationId || existingByEvent.correlation_id,
    });
  } else {
    webhookEvent = await webhookEventRepo.insertWebhookEvent({
      webhookUuid: randomUuid(),
      paymentProvider: PROVIDER,
      providerEventId: parsed.providerEventId,
      eventType: parsed.eventType,
      providerOrderId: parsed.providerOrderId,
      providerPaymentId: parsed.providerPaymentId,
      providerRefundId: parsed.providerRefundId,
      payload,
      payloadHash,
      signature,
      signatureValid: true,
      correlationId,
      sourceIp,
    });
    if (!webhookEvent) {
      const dup = await webhookEventRepo.findByProviderEventId(PROVIDER, parsed.providerEventId);
      return { ok: true, duplicate: true, webhookEventId: dup?.id, reason: 'race_duplicate' };
    }
  }

  await webhookEventRepo.updateWebhookEvent(webhookEvent.id, {
    processingStatus: 'VALIDATED',
    signatureValid: 1,
  });

  const attempt = await webhookEventRepo.insertProcessingAttempt({
    webhookEventId: webhookEvent.id,
    attemptNo: (webhookEvent.retry_count || 0) + 1,
    status: 'STARTED',
    startedAt: new Date(),
  });

  let handlerResult;
  try {
    await webhookEventRepo.updateWebhookEvent(webhookEvent.id, { processingStatus: 'PROCESSING' });
    handlerResult = await webhookHandlerRouter.dispatch(parsed.eventType, {
      parsed,
      webhookEvent,
      correlationId,
      eventSource,
      io,
      emitPaymentEvent,
    });
    await webhookEventRepo.updateWebhookEvent(webhookEvent.id, {
      processingStatus: isReplay ? 'REPLAYED' : 'PROCESSED',
      processedAt: new Date(),
      lastError: null,
    });
    await webhookEventRepo.insertProcessingAttempt({
      webhookEventId: webhookEvent.id,
      attemptNo: attempt.attempt_no,
      status: 'SUCCEEDED',
      durationMs: Date.now() - started,
      startedAt: attempt.started_at,
      finishedAt: new Date(),
    });
  } catch (err) {
    logger.error({ err: err.message, webhookEventId: webhookEvent.id, correlationId }, 'webhook_handler_failed');
    await webhookEventRepo.updateWebhookEvent(webhookEvent.id, {
      processingStatus: 'FAILED',
      retryCount: (webhookEvent.retry_count || 0) + 1,
      lastError: err.message?.slice(0, 512),
    });
    await webhookEventRepo.insertProcessingAttempt({
      webhookEventId: webhookEvent.id,
      attemptNo: attempt.attempt_no,
      status: 'FAILED',
      errorMessage: err.message?.slice(0, 512),
      durationMs: Date.now() - started,
      startedAt: attempt.started_at,
      finishedAt: new Date(),
    });
    if (isLedgerSchemaError(err)) throw err;
    return { ok: false, reason: 'handler_error', webhookEventId: webhookEvent.id, error: err.message };
  }

  logger.info(
    {
      webhookEventId: webhookEvent.id,
      eventType: parsed.eventType,
      providerEventId: parsed.providerEventId,
      correlationId,
      handlerResult,
      durationMs: Date.now() - started,
    },
    'webhook_ingested'
  );

  return {
    ok: true,
    webhookEventId: webhookEvent.id,
    eventType: parsed.eventType,
    handlerResult,
    replay: isReplay,
  };
}

module.exports = { ingestWebhook, isLedgerSchemaError };
