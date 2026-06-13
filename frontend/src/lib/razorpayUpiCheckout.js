/**
 * Razorpay Standard Checkout — UPI real-time only (Intent / QR / Collect).
 * @see https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/configure-payment-methods/
 */

const UPI_BLOCK_CODE = 'upi_realtime';

/**
 * @param {object} params
 * @param {object} params.order — create-order response order
 * @param {string} [params.description]
 * @param {function} params.onPaid — Razorpay handler callback
 * @param {function} [params.onDismiss]
 * @param {function} [params.onFailed]
 */
export function buildUpiOnlyCheckoutOptions({ order, description, onPaid, onDismiss, onFailed }) {
  return {
    key: order.razorpayKeyId,
    amount: order.amountPaise,
    currency: order.currency || 'INR',
    name: 'Thumbs Up Distribution',
    description: description || 'UPI Real-time Payment',
    order_id: order.razorpayOrderId,
    image: '/pwa-192x192.png',
    theme: { color: '#D42B2B', backdrop_color: '#0F0F0F' },
    /* Disable all non-UPI methods at the API level */
    method: {
      upi: true,
      card: false,
      netbanking: false,
      wallet: false,
      paylater: false,
      emi: false,
    },
    /* Show ONLY the UPI block — hides Cards / Netbanking / Wallet / Pay Later */
    config: {
      display: {
        blocks: {
          [UPI_BLOCK_CODE]: {
            name: 'UPI — Real-time payment',
            instruments: [{ method: 'upi' }],
          },
        },
        sequence: [`block.${UPI_BLOCK_CODE}`],
        preferences: {
          show_default_blocks: false,
        },
      },
    },
    prefill: {
      method: 'upi',
    },
    notes: {
      payment_type: 'upi_realtime',
      order_uuid: order.orderUuid,
    },
    handler: onPaid,
    modal: {
      confirm_close: true,
      escape: true,
      ondismiss: onDismiss,
    },
    retry: { enabled: true, max_count: 3 },
  };
}

/**
 * Attach Razorpay event listeners for clearer UX errors.
 */
export function attachUpiCheckoutListeners(rzp, { onFailed } = {}) {
  if (!rzp?.on) return;
  rzp.on('payment.failed', (res) => {
    const msg =
      res?.error?.description ||
      res?.error?.reason ||
      'UPI payment failed. Try again or use a different UPI app.';
    onFailed?.(msg, res);
  });
  rzp.on('payment.error', (res) => {
    const msg = res?.error?.description || 'Payment error';
    onFailed?.(msg, res);
  });
}
