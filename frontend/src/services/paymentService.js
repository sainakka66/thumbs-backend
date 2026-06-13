import { apiJson, apiRequest } from './api';
import { getDeviceFingerprint } from '../lib/deviceFingerprint';

function buildDeviceSignals() {
  try {
    return {
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      browserHash: getDeviceFingerprint(),
    };
  } catch {
    return {};
  }
}

function paymentHeaders(extra = {}) {
  const fp = getDeviceFingerprint();
  let timezone = '';
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    timezone = '';
  }
  return {
    ...extra,
    ...(fp ? { 'X-Device-Fingerprint': fp } : {}),
    ...(timezone ? { 'X-Timezone': timezone } : {}),
  };
}

export async function getGatewayHealth() {
  return apiJson('/payments/gateway-health', { headers: paymentHeaders() });
}

export async function createOrder({ amount, customerId, idempotencyKey, description }) {
  return apiJson('/payments/create-order', {
    method: 'POST',
    headers: paymentHeaders({ 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey || '' }),
    body: JSON.stringify({
      amount,
      customerId,
      idempotencyKey,
      description,
      deviceSignals: buildDeviceSignals(),
    }),
  });
}

export async function verifyPayment(payload) {
  return apiJson('/payments/verify', {
    method: 'POST',
    headers: paymentHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
}

export async function getPaymentStatus(id) {
  return apiJson(`/payments/status/${encodeURIComponent(id)}`, {
    headers: paymentHeaders(),
  });
}

export async function getPaymentHistory({ limit = 50, offset = 0, status } = {}) {
  const q = new URLSearchParams({ limit, offset });
  if (status) q.set('status', status);
  return apiJson(`/payments/history?${q}`, { headers: paymentHeaders() });
}

export async function analyzeRisk({ amount, customerId }) {
  return apiJson('/risk/analyze', {
    method: 'POST',
    headers: paymentHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ amount, customerId }),
  });
}

export async function adminMonitor(params = {}) {
  const q = new URLSearchParams(params);
  return apiJson(`/admin/payments/monitor?${q}`, { headers: paymentHeaders() });
}

export async function adminFraudQueue() {
  return apiJson('/admin/payments/fraud-queue', { headers: paymentHeaders() });
}

export async function adminWebhooks() {
  return apiJson('/admin/payments/webhooks', { headers: paymentHeaders() });
}

export async function blockUser(userId, reason) {
  return apiJson('/admin/block-user', {
    method: 'POST',
    headers: paymentHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ userId, reason }),
  });
}

export async function initiateRefund({ orderUuid, amountInr, reason }) {
  return apiJson('/payments/refund', {
    method: 'POST',
    headers: paymentHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ orderUuid, amountInr, reason }),
  });
}

export function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.async = true;
    s.onload = () => resolve(window.Razorpay);
    s.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(s);
  });
}
