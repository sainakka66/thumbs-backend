const APP_NAME = process.env.APP_NAME || 'Vaishnavi Agencies';

function paymentSuccess({ orderUuid, amountInr }) {
  const subject = `${APP_NAME} — Payment received`;
  const text = `Your payment of ₹${amountInr} for order ${orderUuid} was captured successfully.`;
  const html = `<p>Your payment of <strong>₹${amountInr}</strong> for order <code>${orderUuid}</code> was captured successfully.</p>`;
  return { subject, text, html };
}

function paymentFailed({ orderUuid }) {
  const subject = `${APP_NAME} — Payment failed`;
  const text = `Your payment for order ${orderUuid} could not be completed.`;
  const html = `<p>Your payment for order <code>${orderUuid}</code> could not be completed.</p>`;
  return { subject, text, html };
}

function paymentSettled({ orderUuid, amountInr }) {
  const subject = `${APP_NAME} — Payment settled`;
  const text = `Your payment of ₹${amountInr} for order ${orderUuid} has been settled.`;
  const html = `<p>Your payment of <strong>₹${amountInr}</strong> for order <code>${orderUuid}</code> has been settled.</p>`;
  return { subject, text, html };
}

function refundCreated({ orderUuid, amountInr }) {
  const subject = `${APP_NAME} — Refund initiated`;
  const text = `A refund of ₹${amountInr} has been initiated for order ${orderUuid}.`;
  const html = `<p>A refund of <strong>₹${amountInr}</strong> has been initiated for order <code>${orderUuid}</code>.</p>`;
  return { subject, text, html };
}

function refundCompleted({ orderUuid, amountInr }) {
  const subject = `${APP_NAME} — Refund completed`;
  const text = `Your refund of ₹${amountInr} for order ${orderUuid} has been processed.`;
  const html = `<p>Your refund of <strong>₹${amountInr}</strong> for order <code>${orderUuid}</code> has been processed.</p>`;
  return { subject, text, html };
}

module.exports = {
  paymentSuccess,
  paymentFailed,
  paymentSettled,
  refundCreated,
  refundCompleted,
};
