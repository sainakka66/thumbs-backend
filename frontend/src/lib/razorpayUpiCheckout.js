/**
 * Razorpay Standard Checkout — UPI real-time with tiered fallback.
 * Tier escalation fixes "No appropriate payment method found" on mobile
 * and when UPI block config is too strict for the account.
 * @see https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/configure-payment-methods/
 */

import { isMethodUnavailableError } from './paymentIssues';

const UPI_BLOCK = 'upi';

const NON_UPI_METHODS = {
  card: false,
  netbanking: false,
  wallet: false,
  paylater: false,
  emi: false,
  upi: true,
};

const HIDE_NON_UPI = [
  { method: 'card' },
  { method: 'netbanking' },
  { method: 'wallet' },
  { method: 'paylater' },
  { method: 'emi' },
];

function baseCheckoutFields({ order, description, onPaid, onDismiss }) {
  return {
    key: order.razorpayKeyId,
    amount: order.amountPaise,
    currency: order.currency || 'INR',
    name: 'Thumbs Up Distribution',
    description: description || 'UPI Real-time Payment',
    order_id: order.razorpayOrderId,
    image: `${window.location.origin}/pwa-192x192.png`,
    theme: { color: '#D42B2B', backdrop_color: '#0F0F0F' },
    method: { ...NON_UPI_METHODS },
    prefill: { method: 'upi' },
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

/** Checkout tiers — strict → relaxed. Mobile starts at tier 0 (mobile-safe). */
export const CHECKOUT_TIERS = [
  {
    id: 'mobile_safe',
    label: 'UPI mobile-safe',
    buildOptions(ctx) {
      const base = baseCheckoutFields(ctx);
      return {
        ...base,
        config: {
          display: {
            blocks: {
              [UPI_BLOCK]: {
                name: 'UPI — Real-time payment',
                instruments: [{ method: 'upi' }],
              },
            },
            sequence: ['block.upi', 'upi'],
            hide: HIDE_NON_UPI,
            preferences: { show_default_blocks: true },
          },
        },
      };
    },
  },
  {
    id: 'upi_native',
    label: 'UPI native section',
    buildOptions(ctx) {
      const base = baseCheckoutFields(ctx);
      return {
        ...base,
        config: {
          display: {
            sequence: ['upi'],
            hide: HIDE_NON_UPI,
            preferences: { show_default_blocks: true },
          },
        },
      };
    },
  },
  {
    id: 'upi_method_only',
    label: 'UPI method filter',
    buildOptions(ctx) {
      return baseCheckoutFields(ctx);
    },
  },
];

function pickTierOrder() {
  const narrow = typeof window !== 'undefined' && window.innerWidth < 520;
  if (narrow) return [...CHECKOUT_TIERS];
  return CHECKOUT_TIERS;
}

function openSingleTier(Razorpay, tier, ctx) {
  return new Promise((resolve) => {
    let settled = false;
    let escalating = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const options = tier.buildOptions(ctx);
    const userHandler = options.handler;
    options.handler = (response) => {
      finish({ paid: true, response });
      userHandler(response);
    };

    const userDismiss = options.modal?.ondismiss;
    options.modal = {
      ...options.modal,
      ondismiss: () => {
        if (escalating) return;
        finish({ dismissed: true });
        userDismiss?.();
      },
    };

    const rzp = new Razorpay(options);

    const onMethodError = (res) => {
      const msg = res?.error?.description || res?.error?.reason || res?.error?.message || '';
      if (isMethodUnavailableError(msg)) {
        escalating = true;
        try {
          rzp.close();
        } catch {
          /* ignore */
        }
        finish({ escalate: true, error: msg });
        return;
      }
      finish({ failed: true, error: msg || 'Payment error' });
      ctx.onFailed?.(msg, res);
    };

    rzp.on('payment.error', onMethodError);
    rzp.on('payment.failed', (res) => {
      const msg =
        res?.error?.description ||
        res?.error?.reason ||
        'UPI payment failed. Try again or use a different UPI app.';
      finish({ failed: true, error: msg });
      ctx.onFailed?.(msg, res);
    });

    rzp.open();
  });
}

/**
 * Open Razorpay with tier escalation until UPI methods appear or tiers exhaust.
 */
export async function openUpiCheckout(Razorpay, ctx) {
  const tiers = pickTierOrder();
  let lastError = null;

  for (let i = 0; i < tiers.length; i++) {
    const tier = tiers[i];
    ctx.onTierChange?.(tier.id, i + 1, tiers.length);

    const outcome = await openSingleTier(Razorpay, tier, ctx);

    if (outcome.paid) {
      return { success: true, tier: tier.id };
    }
    if (outcome.dismissed) {
      return { dismissed: true, tier: tier.id };
    }
    if (outcome.failed) {
      return { failed: true, error: outcome.error, tier: tier.id };
    }
    if (outcome.escalate) {
      lastError = outcome.error;
      continue;
    }
  }

  return {
    failed: true,
    exhausted: true,
    error:
      lastError ||
      'No UPI payment method available. Enable UPI in Razorpay Dashboard → Payment methods.',
    tier: tiers[tiers.length - 1]?.id,
  };
}

/** @deprecated use openUpiCheckout — kept for tests */
export function buildUpiOnlyCheckoutOptions(ctx) {
  return CHECKOUT_TIERS[0].buildOptions(ctx);
}

export function attachUpiCheckoutListeners() {
  /* listeners attached inside openSingleTier */
}
