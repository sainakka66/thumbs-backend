const PROVIDER = 'razorpay';

function parseRazorpayWebhook(payload, payloadHash) {
  const eventType = payload?.event || 'unknown';
  const payment = payload?.payload?.payment?.entity || null;
  const order = payload?.payload?.order?.entity || null;
  const refund = payload?.payload?.refund?.entity || null;

  const providerEventId =
    payload?.id ||
    payload?.event_id ||
    (payment?.id && `${eventType}:${payment.id}`) ||
    (order?.id && `${eventType}:${order.id}`) ||
    (refund?.id && `${eventType}:${refund.id}`) ||
    `hash:${payloadHash}`;

  const providerOrderId = payment?.order_id || order?.id || refund?.order_id || null;
  const providerPaymentId = payment?.id || refund?.payment_id || null;
  const providerRefundId = refund?.id || null;
  const amountPaise = payment?.amount || order?.amount || refund?.amount || null;
  const entityStatus = payment?.status || order?.status || refund?.status || null;

  return {
    provider: PROVIDER,
    providerEventId: String(providerEventId),
    eventType,
    providerOrderId,
    providerPaymentId,
    providerRefundId,
    amountPaise: amountPaise != null ? parseInt(amountPaise, 10) : null,
    entityStatus,
    payment,
    order,
    refund,
  };
}

module.exports = { PROVIDER, parseRazorpayWebhook };
