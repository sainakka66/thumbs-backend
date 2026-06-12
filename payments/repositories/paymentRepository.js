const { query, queryRows } = require('../../lib/db/safeQuery');

async function findOrderByUuid(orderUuid) {
  const rows = await queryRows(
    `SELECT * FROM payment_orders WHERE order_uuid = ? AND deleted_at IS NULL LIMIT 1`,
    [orderUuid]
  );
  return rows[0] || null;
}

async function findOrderById(id) {
  const rows = await queryRows(
    `SELECT * FROM payment_orders WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findOrderByRazorpayOrderId(razorpayOrderId) {
  const rows = await queryRows(
    `SELECT * FROM payment_orders WHERE razorpay_order_id = ? LIMIT 1`,
    [razorpayOrderId]
  );
  return rows[0] || null;
}

async function findOrderByProviderOrderId(provider, providerOrderId) {
  const rows = await queryRows(
    `SELECT * FROM payment_orders
     WHERE (provider_order_id = ? OR razorpay_order_id = ?)
       AND payment_provider = ?
     LIMIT 1`,
    [providerOrderId, providerOrderId, provider]
  );
  return rows[0] || null;
}

async function findByIdempotencyKey(key) {
  const rows = await queryRows(
    `SELECT * FROM payment_orders WHERE idempotency_key = ? LIMIT 1`,
    [key]
  );
  return rows[0] || null;
}

async function createOrder(data) {
  const [result] = await query(
    `INSERT INTO payment_orders (
      order_uuid, idempotency_key, user_id, customer_id, distributor_id,
      amount_paise, amount_inr, gst_paise, fee_paise, currency, status,
      payment_method, description, receipt_ref, risk_score, verification_flags,
      metadata, device_fingerprint, ip_address, geo_country, geo_region
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.orderUuid,
      data.idempotencyKey || null,
      data.userId,
      data.customerId || null,
      data.distributorId || null,
      data.amountPaise,
      data.amountInr,
      data.gstPaise || 0,
      data.feePaise || 0,
      data.status || 'CREATED',
      data.paymentMethod || 'upi',
      data.description || null,
      data.receiptRef || null,
      data.riskScore || 0,
      data.verificationFlags ? JSON.stringify(data.verificationFlags) : null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.deviceFingerprint || null,
      data.ipAddress || null,
      data.geoCountry || null,
      data.geoRegion || null,
    ]
  );
  return findOrderById(result.insertId);
}

async function updateOrderStatus(orderId, status, extra = {}) {
  const sets = ['status = ?', 'updated_at = NOW()'];
  const params = [status];
  if (extra.razorpayOrderId) {
    sets.push('razorpay_order_id = ?');
    params.push(extra.razorpayOrderId);
  }
  if (extra.providerOrderId) {
    sets.push('provider_order_id = ?');
    params.push(extra.providerOrderId);
  }
  if (extra.riskScore != null) {
    sets.push('risk_score = ?');
    params.push(extra.riskScore);
  }
  if (extra.verificationFlags) {
    sets.push('verification_flags = ?');
    params.push(JSON.stringify(extra.verificationFlags));
  }
  if (extra.lifecycleStage) {
    sets.push('lifecycle_stage = ?');
    params.push(extra.lifecycleStage);
  }
  if (extra.correlationId) {
    sets.push('correlation_id = ?');
    params.push(extra.correlationId);
  }
  if (extra.authorizedAt) {
    sets.push('authorized_at = ?');
    params.push(extra.authorizedAt);
  }
  if (extra.capturedAt) {
    sets.push('captured_at = ?');
    params.push(extra.capturedAt);
  }
  if (extra.settledAt) {
    sets.push('settled_at = ?');
    params.push(extra.settledAt);
  }
  params.push(orderId);
  await query(`UPDATE payment_orders SET ${sets.join(', ')} WHERE id = ?`, params);
  return findOrderById(orderId);
}

async function updateOrderLifecycle(orderId, lifecycleStage, extra = {}) {
  const sets = ['lifecycle_stage = ?', 'updated_at = NOW()'];
  const params = [lifecycleStage];
  if (extra.status) {
    sets.push('status = ?');
    params.push(extra.status);
  }
  if (extra.razorpayOrderId) {
    sets.push('razorpay_order_id = ?');
    params.push(extra.razorpayOrderId);
  }
  if (extra.providerOrderId) {
    sets.push('provider_order_id = ?');
    params.push(extra.providerOrderId);
  }
  if (extra.correlationId) {
    sets.push('correlation_id = ?');
    params.push(extra.correlationId);
  }
  if (extra.authorizedAt) {
    sets.push('authorized_at = ?');
    params.push(extra.authorizedAt);
  }
  if (extra.capturedAt) {
    sets.push('captured_at = ?');
    params.push(extra.capturedAt);
  }
  if (extra.settledAt) {
    sets.push('settled_at = ?');
    params.push(extra.settledAt);
  }
  params.push(orderId);
  await query(`UPDATE payment_orders SET ${sets.join(', ')} WHERE id = ?`, params);
  return findOrderById(orderId);
}

async function createTransaction(data) {
  const [result] = await query(
    `INSERT INTO payment_transactions (
      payment_order_id, razorpay_payment_id, upi_transaction_ref, payer_vpa,
      masked_metadata, status, amount_paise, timeline
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.paymentOrderId,
      data.razorpayPaymentId || null,
      data.upiTransactionRef || null,
      data.payerVpa || null,
      data.maskedMetadata ? JSON.stringify(data.maskedMetadata) : null,
      data.status || 'PENDING',
      data.amountPaise,
      data.timeline ? JSON.stringify(data.timeline) : JSON.stringify([{ status: data.status, at: new Date().toISOString() }]),
    ]
  );
  const rows = await queryRows(`SELECT * FROM payment_transactions WHERE id = ?`, [result.insertId]);
  return rows[0];
}

async function updateTransaction(id, fields) {
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    sets.push(`${col} = ?`);
    params.push(typeof v === 'object' && v !== null && !(v instanceof Date) ? JSON.stringify(v) : v);
  }
  if (!sets.length) return;
  params.push(id);
  await query(`UPDATE payment_transactions SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
}

async function findTransactionByRazorpayPaymentId(paymentId) {
  const rows = await queryRows(
    `SELECT * FROM payment_transactions WHERE razorpay_payment_id = ? OR provider_payment_id = ? LIMIT 1`,
    [paymentId, paymentId]
  );
  return rows[0] || null;
}

async function findTransactionByProviderPaymentId(provider, paymentId) {
  const rows = await queryRows(
    `SELECT * FROM payment_transactions
     WHERE payment_provider = ? AND (provider_payment_id = ? OR razorpay_payment_id = ?)
     LIMIT 1`,
    [provider, paymentId, paymentId]
  );
  return rows[0] || null;
}

async function updateTransactionLifecycle(transactionId, lifecycleStage, fields = {}) {
  await updateTransaction(transactionId, {
    lifecycleStage,
    status: fields.status,
    providerPaymentId: fields.providerPaymentId,
    razorpayPaymentId: fields.providerPaymentId,
    correlationId: fields.correlationId,
    verifiedAt: fields.verifiedAt,
    settledAt: fields.settledAt,
    payerVpa: fields.payerVpa,
    maskedMetadata: fields.maskedMetadata,
    failureReason: fields.failureReason,
  });
  const rows = await queryRows(`SELECT * FROM payment_transactions WHERE id = ?`, [transactionId]);
  return rows[0] || null;
}

async function findRefundByProviderRefundId(provider, providerRefundId) {
  const rows = await queryRows(
    `SELECT * FROM payment_refunds
     WHERE payment_provider = ? AND (provider_refund_id = ? OR razorpay_refund_id = ?)
     LIMIT 1`,
    [provider, providerRefundId, providerRefundId]
  );
  return rows[0] || null;
}

async function sumRefundedPaiseForTransaction(paymentTransactionId) {
  const rows = await queryRows(
    `SELECT COALESCE(SUM(amount_paise), 0) AS total FROM payment_refunds
     WHERE payment_transaction_id = ? AND lifecycle_stage IN ('PENDING','PROCESSED','CREATED')`,
    [paymentTransactionId]
  );
  return rows[0]?.total || 0;
}

async function updateRefundLifecycle(refundId, fields) {
  const sets = [];
  const params = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    const col = k.replace(/([A-Z])/g, '_$1').toLowerCase();
    sets.push(`${col} = ?`);
    params.push(v);
  }
  if (!sets.length) return null;
  params.push(refundId);
  await query(`UPDATE payment_refunds SET ${sets.join(', ')}, updated_at = NOW() WHERE id = ?`, params);
  const rows = await queryRows(`SELECT * FROM payment_refunds WHERE id = ?`, [refundId]);
  return rows[0] || null;
}

async function getLatestTransaction(orderId) {
  const rows = await queryRows(
    `SELECT * FROM payment_transactions WHERE payment_order_id = ? ORDER BY id DESC LIMIT 1`,
    [orderId]
  );
  return rows[0] || null;
}

async function recordAttempt({ paymentOrderId, attemptNo, status, ipAddress, deviceFingerprint, errorCode, errorMessage }) {
  await query(
    `INSERT INTO payment_attempts (payment_order_id, attempt_no, status, ip_address, device_fingerprint, error_code, error_message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [paymentOrderId, attemptNo, status, ipAddress, deviceFingerprint, errorCode, errorMessage]
  );
}

async function countRecentOrders(userId, windowMinutes) {
  const rows = await queryRows(
    `SELECT COUNT(*) AS cnt FROM payment_orders
     WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
       AND status NOT IN ('CANCELLED','FAILED')`,
    [userId, windowMinutes]
  );
  return rows[0]?.cnt || 0;
}

async function countAttempts(orderId) {
  const rows = await queryRows(
    `SELECT COUNT(*) AS cnt FROM payment_attempts WHERE payment_order_id = ?`,
    [orderId]
  );
  return rows[0]?.cnt || 0;
}

async function saveWebhook({
  eventId,
  eventType,
  razorpayOrderId,
  razorpayPaymentId,
  signatureValid,
  payloadHash,
  payload,
  replayDetected,
  webhookTimestamp,
  nonce,
}) {
  try {
    const [result] = await query(
      `INSERT INTO payment_webhooks (event_id, event_type, razorpay_order_id, razorpay_payment_id, signature_valid, replay_detected, webhook_timestamp, nonce, payload_hash, payload)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventId,
        eventType,
        razorpayOrderId,
        razorpayPaymentId,
        signatureValid ? 1 : 0,
        replayDetected ? 1 : 0,
        webhookTimestamp || null,
        nonce || null,
        payloadHash,
        JSON.stringify(payload),
      ]
    );
    return result.insertId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return null;
    throw err;
  }
}

async function markWebhookProcessed(id, errorMessage) {
  await query(
    `UPDATE payment_webhooks SET processed = 1, processed_at = NOW(), error_message = ? WHERE id = ?`,
    [errorMessage || null, id]
  );
}

async function listPaymentHistory({ userId, limit = 50, offset = 0, status }) {
  const params = [userId];
  let where = 'po.user_id = ? AND po.deleted_at IS NULL';
  if (status) {
    where += ' AND po.status = ?';
    params.push(status);
  }
  params.push(limit, offset);
  return queryRows(
    `SELECT po.*, pt.razorpay_payment_id, pt.payer_vpa, pt.upi_transaction_ref
     FROM payment_orders po
     LEFT JOIN payment_transactions pt ON pt.payment_order_id = po.id
     WHERE ${where}
     ORDER BY po.created_at DESC
     LIMIT ? OFFSET ?`,
    params
  );
}

async function listAdminPayments({ limit = 50, offset = 0, status, flaggedOnly }) {
  const params = [];
  let where = 'po.deleted_at IS NULL';
  if (status) {
    where += ' AND po.status = ?';
    params.push(status);
  }
  if (flaggedOnly) {
    where += ` AND po.status = 'FLAGGED_FOR_REVIEW'`;
  }
  params.push(limit, offset);
  return queryRows(
    `SELECT po.*, u.username, c.shop_name AS customer_name
     FROM payment_orders po
     LEFT JOIN users u ON u.id = po.user_id
     LEFT JOIN customers c ON c.id = po.customer_id
     WHERE ${where}
     ORDER BY po.created_at DESC
     LIMIT ? OFFSET ?`,
    params
  );
}

async function createRefund({ paymentTransactionId, razorpayRefundId, amountPaise, status, reason, initiatedBy }) {
  const [result] = await query(
    `INSERT INTO payment_refunds (payment_transaction_id, razorpay_refund_id, amount_paise, status, reason, initiated_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [paymentTransactionId, razorpayRefundId, amountPaise, status, reason, initiatedBy]
  );
  return result.insertId;
}

module.exports = {
  findOrderByUuid,
  findOrderById,
  findOrderByRazorpayOrderId,
  findOrderByProviderOrderId,
  findByIdempotencyKey,
  createOrder,
  updateOrderStatus,
  updateOrderLifecycle,
  createTransaction,
  updateTransaction,
  updateTransactionLifecycle,
  findTransactionByRazorpayPaymentId,
  findTransactionByProviderPaymentId,
  findRefundByProviderRefundId,
  updateRefundLifecycle,
  sumRefundedPaiseForTransaction,
  getLatestTransaction,
  recordAttempt,
  countRecentOrders,
  countAttempts,
  saveWebhook,
  markWebhookProcessed,
  listPaymentHistory,
  listAdminPayments,
  createRefund,
};
