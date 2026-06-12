const paymentRepo = require('../repositories/paymentRepository');
const timelineRepo = require('../repositories/timelineRepository');
const unifiedAuditRepo = require('../repositories/unifiedAuditRepository');
const { PROVIDER } = require('../providers/razorpay/RazorpayWebhookParser');

const NON_FAILURE_TERMINAL = new Set(['CAPTURED', 'PROCESSING', 'SETTLED', 'REFUNDED']);

async function resolveOrder(parsed) {
  if (!parsed.providerOrderId) return null;
  return paymentRepo.findOrderByProviderOrderId(parsed.provider, providerOrderId(parsed));
}

function providerOrderId(parsed) {
  return parsed.providerOrderId;
}

async function resolveOrderByPayment(parsed) {
  if (parsed.providerOrderId) {
    const byOrder = await paymentRepo.findOrderByProviderOrderId(PROVIDER, parsed.providerOrderId);
    if (byOrder) return byOrder;
  }
  if (parsed.providerPaymentId) {
    const tx = await paymentRepo.findTransactionByProviderPaymentId(PROVIDER, parsed.providerPaymentId);
    if (tx) return paymentRepo.findOrderById(tx.payment_order_id);
  }
  return null;
}

async function getLatestTransaction(orderId) {
  return paymentRepo.getLatestTransaction(orderId);
}

async function appendTimeline(ctx) {
  return timelineRepo.appendTimeline({
    paymentOrderId: ctx.order.id,
    paymentTransactionId: ctx.transaction?.id,
    stage: ctx.stage,
    eventSource: ctx.eventSource || 'WEBHOOK',
    eventType: ctx.eventType,
    webhookEventId: ctx.webhookEventId,
    correlationId: ctx.correlationId,
    details: ctx.details,
  });
}

async function auditTransition(ctx) {
  return unifiedAuditRepo.logAudit({
    entityType: 'payment_order',
    entityId: ctx.order.id,
    action: ctx.action,
    oldState: ctx.oldState,
    newState: ctx.newState,
    correlationId: ctx.correlationId,
    metadata: ctx.metadata,
  });
}

function shouldSkipFailure(order) {
  return NON_FAILURE_TERMINAL.has(order.lifecycle_stage);
}

function shouldSkipCapture(order) {
  return ['CAPTURED', 'PROCESSING', 'SETTLED', 'REFUNDED'].includes(order.lifecycle_stage);
}

module.exports = {
  PROVIDER,
  resolveOrder,
  resolveOrderByPayment,
  getLatestTransaction,
  appendTimeline,
  auditTransition,
  shouldSkipFailure,
  shouldSkipCapture,
};
