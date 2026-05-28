const QUEUE_KEY = 'tu_offline_payments';

export function queueOfflinePayment(payload) {
  const list = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  list.push({ ...payload, queuedAt: new Date().toISOString(), id: crypto.randomUUID() });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(list.slice(-20)));
}

export async function flushOfflinePaymentQueue() {
  const list = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  if (!list.length) return;
  const { createOrder } = await import('../services/paymentService');
  const remaining = [];
  for (const item of list) {
    try {
      await createOrder({
        amount: item.amount,
        customerId: item.customerId,
        description: item.description,
        idempotencyKey: `offline_${item.id}`,
      });
    } catch {
      remaining.push(item);
    }
  }
  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}
