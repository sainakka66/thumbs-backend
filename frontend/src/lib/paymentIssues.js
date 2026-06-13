/**
 * Isolated payment issue taxonomy — each kind gets its own UI "room".
 */
export const PAYMENT_ISSUE_KINDS = {
  IDLE: 'IDLE',
  GATEWAY_CONFIG: 'GATEWAY_CONFIG',
  UPI_UNAVAILABLE: 'UPI_UNAVAILABLE',
  CHECKOUT_ERROR: 'CHECKOUT_ERROR',
  NETWORK: 'NETWORK',
  VERIFY: 'VERIFY',
  CANCELLED: 'CANCELLED',
  OFFLINE: 'OFFLINE',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
};

const METHOD_UNAVAILABLE_RE =
  /no appropriate payment method|payment method is not configured|not configured/i;

export const ISSUE_ROOMS = {
  [PAYMENT_ISSUE_KINDS.GATEWAY_CONFIG]: {
    title: 'Gateway Not Configured',
    summary: 'Razorpay keys are missing or invalid on the server.',
    hint: 'Ask admin to set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on Render, then redeploy.',
    severity: 'error',
  },
  [PAYMENT_ISSUE_KINDS.UPI_UNAVAILABLE]: {
    title: 'UPI Not Activated',
    summary: 'Razorpay returned “No appropriate payment method found”.',
    hint: 'In Razorpay Dashboard → Account & Settings → Payment methods → activate UPI (test or live). Then retry.',
    severity: 'error',
  },
  [PAYMENT_ISSUE_KINDS.CHECKOUT_ERROR]: {
    title: 'Checkout Error',
    summary: 'Razorpay checkout could not complete.',
    hint: 'Close and retry. If it persists, switch network or try again in a few minutes.',
    severity: 'error',
  },
  [PAYMENT_ISSUE_KINDS.NETWORK]: {
    title: 'Connection Issue',
    summary: 'Could not reach the payment server.',
    hint: 'Check internet connection. Render free tier may need ~30s to wake up after idle.',
    severity: 'warning',
  },
  [PAYMENT_ISSUE_KINDS.VERIFY]: {
    title: 'Verification Pending',
    summary: 'Payment submitted — waiting for bank/UPI confirmation.',
    hint: 'Do not close this screen. Webhook will confirm within a few seconds.',
    severity: 'info',
  },
  [PAYMENT_ISSUE_KINDS.CANCELLED]: {
    title: 'Payment Cancelled',
    summary: 'You closed the Razorpay window before paying.',
    hint: 'Tap Pay with UPI again when ready.',
    severity: 'neutral',
  },
  [PAYMENT_ISSUE_KINDS.OFFLINE]: {
    title: 'Offline — Queued',
    summary: 'Payment saved locally and will sync when back online.',
    hint: 'Reconnect to the internet to complete the UPI flow.',
    severity: 'info',
  },
  [PAYMENT_ISSUE_KINDS.PROCESSING]: {
    title: 'Processing UPI Payment',
    summary: 'Opening Razorpay or confirming with your bank…',
    hint: 'Complete payment in your UPI app if prompted.',
    severity: 'info',
  },
  [PAYMENT_ISSUE_KINDS.SUCCESS]: {
    title: 'Payment Successful',
    summary: 'UPI payment confirmed and recorded.',
    hint: null,
    severity: 'success',
  },
};

export function isMethodUnavailableError(message = '') {
  return METHOD_UNAVAILABLE_RE.test(String(message));
}

export function classifyPaymentIssue({ status, error, gatewayReady, checkoutExhausted }) {
  if (status === 'SUCCESS') return PAYMENT_ISSUE_KINDS.SUCCESS;
  if (status === 'OFFLINE_QUEUED') return PAYMENT_ISSUE_KINDS.OFFLINE;
  if (status === 'CANCELLED') return PAYMENT_ISSUE_KINDS.CANCELLED;
  if (gatewayReady === false) return PAYMENT_ISSUE_KINDS.GATEWAY_CONFIG;

  if (error) {
    if (isMethodUnavailableError(error) || checkoutExhausted) {
      return PAYMENT_ISSUE_KINDS.UPI_UNAVAILABLE;
    }
    if (/fetch|network|timeout|failed to load/i.test(error)) {
      return PAYMENT_ISSUE_KINDS.NETWORK;
    }
    if (/verif/i.test(error)) return PAYMENT_ISSUE_KINDS.VERIFY;
    return PAYMENT_ISSUE_KINDS.CHECKOUT_ERROR;
  }

  if (['CREATING', 'INITIATED', 'VERIFYING', 'AWAITING_CONFIRMATION', 'PROCESSING'].includes(status)) {
    return PAYMENT_ISSUE_KINDS.PROCESSING;
  }

  if (status === 'FAILED') return PAYMENT_ISSUE_KINDS.CHECKOUT_ERROR;
  return PAYMENT_ISSUE_KINDS.IDLE;
}
