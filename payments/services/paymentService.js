const { PaymentBlockedError, ConflictError, NotFoundError, ValidationError } = require('../../lib/errors');
const logger = require('../../lib/logger');
const { randomUuid } = require('../utils/crypto');
const paymentRepo = require('../repositories/paymentRepository');
const auditRepo = require('../repositories/auditRepository');
const fraudEngine = require('../fraud/fraudEngine');
const razorpayService = require('./razorpayService');
const validationService = require('./validationService');
const settlementValidation = require('./settlementValidationService');
const deviceTrustService = require('./deviceTrustService');
const webhookReplayGuard = require('./webhookReplayGuard');
const { getPublicRazorpayKeyId } = require('../../config/paymentConfig');
const { withTransaction } = require('../../lib/db/safeQuery');
const { recordSecurityIncident } = require('../repositories/securityRepository');
const { findPendingApproval, approveAction } = require('../repositories/securityRepository');

function emitPaymentEvent(io, userId, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit('payment:update', payload);
  io.to('admin:payments').emit('payment:admin', payload);
}

async function createOrder(req, io) {
  const { customerId, distributorId, amount, idempotencyKey, description, gstPaise, feePaise } =
    req.body || {};

  if (idempotencyKey) {
    const existing = await paymentRepo.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return formatOrderResponse(existing, getPublicRazorpayKeyId());
    }
  }

  const validated = await validationService.validatePaymentEntities({
    authUser: req.authUser,
    customerId: customerId ? parseInt(customerId, 10) : null,
    distributorId: distributorId ? parseInt(distributorId, 10) : null,
    amountInr: amount,
  });

  const deviceTrust = await deviceTrustService.evaluateDeviceTrust(req);

  const orderUuid = randomUuid();
  let order = await paymentRepo.createOrder({
    orderUuid,
    idempotencyKey: idempotencyKey || null,
    userId: req.authUser.id,
    customerId: validated.customer?.id || null,
    distributorId: validated.distributor?.id || null,
    amountPaise: validated.amountPaise,
    amountInr: validated.amount,
    gstPaise: gstPaise || 0,
    feePaise: feePaise || 0,
    status: 'CREATED',
    description: description || validated.description,
    receiptRef: `TU-${Date.now()}`,
    deviceFingerprint: req.deviceFingerprint,
    ipAddress: req.clientIp,
  });

  const risk = await fraudEngine.analyzePaymentRisk({
    userId: req.authUser.id,
    customerId: order.customer_id,
    amountPaise: order.amount_paise,
    ip: req.clientIp,
    deviceFingerprint: req.deviceFingerprint,
    deviceTrust,
    paymentOrderId: order.id,
    email: req.authUser.email,
  });

  await settlementValidation.validateBeforeSettlement({
    authUser: req.authUser,
    customerId: order.customer_id,
    distributorId: order.distributor_id,
    amountPaise: order.amount_paise,
    orderUuid: order.order_uuid,
    idempotencyKey,
    deviceTrust,
    ip: req.clientIp,
    deviceFingerprint: req.deviceFingerprint,
    riskScore: risk.score,
  });

  if (risk.blocked) {
    await paymentRepo.updateOrderStatus(order.id, 'BLOCKED', { riskScore: risk.score });
    await auditRepo.logAudit({
      entityType: 'payment_order',
      entityId: order.id,
      action: 'blocked',
      actorUserId: req.authUser.id,
      newStatus: 'BLOCKED',
      details: { risk },
      ipAddress: req.clientIp,
    });
    throw new PaymentBlockedError('Payment blocked due to risk policy', risk.score);
  }

  if (risk.hold || risk.flagged) {
    await paymentRepo.updateOrderStatus(order.id, 'FLAGGED_FOR_REVIEW', { riskScore: risk.score });
    await auditRepo.logAudit({
      entityType: 'payment_order',
      entityId: order.id,
      action: 'payment_held',
      actorUserId: req.authUser.id,
      newStatus: 'FLAGGED_FOR_REVIEW',
      details: { risk },
      ipAddress: req.clientIp,
    });
    order = await paymentRepo.findOrderById(order.id);
    return {
      success: true,
      requiresReview: true,
      riskCategory: risk.category,
      order: formatOrderResponse(order, getPublicRazorpayKeyId()).order,
    };
  }

  const rzOrder = await razorpayService.createRazorpayOrder({
    amountPaise: order.amount_paise,
    receipt: order.receipt_ref,
    notes: { order_uuid: order.order_uuid, user_id: String(req.authUser.id) },
  });

  await paymentRepo.updateOrderStatus(order.id, 'INITIATED', {
    razorpayOrderId: rzOrder.id,
    riskScore: risk.score,
  });
  await paymentRepo.recordAttempt({
    paymentOrderId: order.id,
    attemptNo: 1,
    status: 'INITIATED',
    ipAddress: req.clientIp,
    deviceFingerprint: req.deviceFingerprint,
  });
  await paymentRepo.createTransaction({
    paymentOrderId: order.id,
    status: 'INITIATED',
    amountPaise: order.amount_paise,
  });

  await auditRepo.logAudit({
    entityType: 'payment_order',
    entityId: order.id,
    action: 'order_created',
    actorUserId: req.authUser.id,
    newStatus: 'INITIATED',
    details: { razorpayOrderId: rzOrder.id },
    ipAddress: req.clientIp,
  });

  order = await paymentRepo.findOrderById(order.id);
  const response = formatOrderResponse(order, getPublicRazorpayKeyId(), rzOrder.id);
  emitPaymentEvent(io, req.authUser.id, { orderUuid: order.order_uuid, status: 'INITIATED' });
  logger.info({ orderId: order.id, userId: req.authUser.id }, 'payment_order_initiated');
  return response;
}

function formatOrderResponse(order, keyId, razorpayOrderIdOverride) {
  return {
    success: true,
    order: {
      id: order.id,
      orderUuid: order.order_uuid,
      status: order.status,
      amountInr: Number(order.amount_inr),
      amountPaise: order.amount_paise,
      currency: order.currency,
      razorpayOrderId: razorpayOrderIdOverride || order.razorpay_order_id,
      razorpayKeyId: keyId,
      customerId: order.customer_id,
      riskScore: Number(order.risk_score),
      createdAt: order.created_at,
    },
  };
}

async function verifyPayment(req, io) {
  const { orderUuid, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body || {};
  if (!orderUuid || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw new ValidationError('Missing verification fields');
  }

  const order = await paymentRepo.findOrderByUuid(orderUuid);
  if (!order || order.user_id !== req.authUser.id) {
    throw new NotFoundError('Order not found');
  }
  if (order.razorpay_order_id !== razorpayOrderId) {
    throw new ValidationError('Order mismatch');
  }
  if (['SUCCESS', 'REFUNDED'].includes(order.status)) {
    return { success: true, status: order.status, duplicate: true };
  }

  const valid = razorpayService.verifyPaymentSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature: razorpaySignature,
  });
  if (!valid) {
    await paymentRepo.recordAttempt({
      paymentOrderId: order.id,
      attemptNo: (await paymentRepo.countAttempts(order.id)) + 1,
      status: 'FAILED',
      ipAddress: req.clientIp,
      errorCode: 'INVALID_SIGNATURE',
      errorMessage: 'Signature verification failed',
    });
    throw new ValidationError('Invalid payment signature');
  }

  const existingTx = await paymentRepo.findTransactionByRazorpayPaymentId(razorpayPaymentId);
  if (existingTx && existingTx.status === 'SUCCESS') {
    return { success: true, status: 'SUCCESS', duplicate: true };
  }

  let paymentMeta = {};
  try {
    const rzPayment = await razorpayService.fetchPayment(razorpayPaymentId);
    paymentMeta = {
      method: rzPayment.method,
      vpa: rzPayment.vpa || null,
      email: rzPayment.email ? '***' : null,
      contact: rzPayment.contact ? '***' : null,
    };
  } catch (e) {
    logger.warn({ err: e.message }, 'razorpay_fetch_payment_failed');
  }

  await withTransaction(async ({ query: txQuery }) => {
    await txQuery(`UPDATE payment_orders SET status = 'SUCCESS', updated_at = NOW() WHERE id = ?`, [order.id]);
    await txQuery(
      `UPDATE payment_transactions SET status = 'SUCCESS', razorpay_payment_id = ?, payer_vpa = ?, upi_transaction_ref = ?, masked_metadata = ?, verified_at = NOW()
       WHERE payment_order_id = ? ORDER BY id DESC LIMIT 1`,
      [
        razorpayPaymentId,
        paymentMeta.vpa || null,
        razorpayPaymentId,
        JSON.stringify(paymentMeta),
        order.id,
      ]
    );
    if (order.customer_id && order.amount_inr) {
      await txQuery(
        `UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance - ?) WHERE id = ?`,
        [order.amount_inr, order.customer_id]
      );
    }
  });

  await auditRepo.logAudit({
    entityType: 'payment_order',
    entityId: order.id,
    action: 'payment_success',
    actorUserId: req.authUser.id,
    oldStatus: order.status,
    newStatus: 'SUCCESS',
    ipAddress: req.clientIp,
  });

  emitPaymentEvent(io, req.authUser.id, { orderUuid, status: 'SUCCESS' });
  return { success: true, status: 'SUCCESS' };
}

async function getPaymentStatus(req) {
  const id = req.params.id;
  const order = /^\d+$/.test(id)
    ? await paymentRepo.findOrderById(parseInt(id, 10))
    : await paymentRepo.findOrderByUuid(id);
  if (!order || (req.authUser.role !== 'admin' && order.user_id !== req.authUser.id)) {
    throw new NotFoundError('Order not found');
  }
  const tx = await paymentRepo.getLatestTransaction(order.id);
  return {
    success: true,
    order: {
      orderUuid: order.order_uuid,
      status: order.status,
      amountInr: Number(order.amount_inr),
      razorpayOrderId: order.razorpay_order_id,
      transaction: tx
        ? {
            status: tx.status,
            razorpayPaymentId: tx.razorpay_payment_id,
            payerVpa: tx.payer_vpa,
            upiTransactionRef: tx.upi_transaction_ref,
          }
        : null,
    },
  };
}

async function processWebhook(rawBody, signature, io, sourceIp) {
  const payload = JSON.parse(rawBody.toString());
  const eventType = payload?.event || 'unknown';
  const entity = payload?.payload?.payment?.entity || payload?.payload?.order?.entity || {};
  const { sha256 } = require('../utils/crypto');
  const payloadHash = sha256(rawBody.toString());

  const signatureValid = razorpayService.verifyWebhookSignature(rawBody, signature);
  if (!signatureValid) {
    await recordSecurityIncident({
      incidentType: 'webhook_invalid_signature',
      severity: 'critical',
      details: { eventType },
      ipAddress: sourceIp,
    });
    logger.warn({ eventType }, 'webhook_invalid_signature');
    return { ok: false, reason: 'invalid_signature' };
  }

  const replay = await webhookReplayGuard.validateWebhookReplay({
    rawBody,
    signature,
    payload,
    sourceIp,
  });
  if (!replay.allowed) {
    return { ok: false, reason: replay.reason, replay: true };
  }

  const webhookId = await paymentRepo.saveWebhook({
    eventId: replay.eventId,
    eventType,
    razorpayOrderId: entity.order_id || entity.id || null,
    razorpayPaymentId: entity.id && entity.order_id ? entity.id : null,
    signatureValid: true,
    payloadHash,
    payload,
    replayDetected: replay.replay ? 1 : 0,
    webhookTimestamp: replay.webhookTs,
    nonce: replay.nonce,
  });

  if (!webhookId) {
    return { ok: true, duplicate: true };
  }

  const order = entity.order_id
    ? await paymentRepo.findOrderByRazorpayOrderId(entity.order_id)
    : await paymentRepo.findOrderByRazorpayOrderId(entity.id);

  if (order && (eventType.includes('paid') || entity.status === 'captured')) {
    if (order.status !== 'SUCCESS') {
      await paymentRepo.updateOrderStatus(order.id, 'SUCCESS');
      emitPaymentEvent(io, order.user_id, { orderUuid: order.order_uuid, status: 'SUCCESS', source: 'webhook' });
    }
  } else if (order && (entity.status === 'failed' || eventType.includes('failed'))) {
    await paymentRepo.updateOrderStatus(order.id, 'FAILED');
    emitPaymentEvent(io, order.user_id, { orderUuid: order.order_uuid, status: 'FAILED', source: 'webhook' });
  }

  await paymentRepo.markWebhookProcessed(webhookId);
  return { ok: true };
}

async function initiateRefund(req, io) {
  const { orderUuid, amountInr, reason, approvalId } = req.body || {};
  const pending = await findPendingApproval('refund', orderUuid);
  if (pending && !approvalId) {
    return {
      success: false,
      requiresApproval: true,
      approvalId: pending.id,
      message: 'Refund requires second admin approval',
    };
  }
  if (approvalId) {
    await approveAction(approvalId, req.authUser.id);
  }

  const order = await paymentRepo.findOrderByUuid(orderUuid);
  if (!order) throw new NotFoundError('Order not found');
  if (order.status !== 'SUCCESS') throw new ConflictError('Only successful payments can be refunded');

  const tx = await paymentRepo.getLatestTransaction(order.id);
  if (!tx?.razorpay_payment_id) throw new ConflictError('No Razorpay payment on record');

  const refundAmount = amountInr ? Math.round(amountInr * 100) : order.amount_paise;
  const refund = await razorpayService.createRefund({
    paymentId: tx.razorpay_payment_id,
    amountPaise: refundAmount,
    notes: { reason: reason || 'admin_refund' },
  });

  await paymentRepo.createRefund({
    paymentTransactionId: tx.id,
    razorpayRefundId: refund.id,
    amountPaise: refundAmount,
    status: 'PENDING',
    reason,
    initiatedBy: req.authUser.id,
  });
  await paymentRepo.updateOrderStatus(order.id, 'REFUNDED');
  emitPaymentEvent(io, order.user_id, { orderUuid, status: 'REFUNDED' });
  return { success: true, refundId: refund.id, status: 'REFUNDED' };
}

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  processWebhook,
  initiateRefund,
  emitPaymentEvent,
};
