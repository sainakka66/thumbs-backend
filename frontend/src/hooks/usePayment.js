import { useCallback, useEffect, useRef, useState } from 'react';
import * as paymentService from '../services/paymentService';
import { usePaymentSocket } from './usePaymentSocket';
import { queueOfflinePayment, flushOfflinePaymentQueue } from '../lib/offlinePaymentQueue';
import { useOnlineStatus } from './useOnlineStatus';

const POLL_MS = 4000;

export function usePayment() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const pollRef = useRef(null);
  const online = useOnlineStatus();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    (orderUuid) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const res = await paymentService.getPaymentStatus(orderUuid);
          const s = res.order?.status;
          if (s && ['SUCCESS', 'FAILED', 'CANCELLED', 'BLOCKED', 'REFUNDED'].includes(s)) {
            setStatus(s);
            stopPolling();
          }
        } catch {
          /* ignore transient poll errors */
        }
      }, POLL_MS);
    },
    [stopPolling]
  );

  usePaymentSocket((payload) => {
    if (payload?.status) setStatus(payload.status);
  });

  useEffect(() => {
    if (!online) return;
    flushOfflinePaymentQueue().catch(() => {});
  }, [online]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const payWithUpi = useCallback(
    async ({ amount, customerId, description, onSuccess }) => {
      setError(null);
      setStatus('CREATING');

      if (!online) {
        await queueOfflinePayment({ amount, customerId, description });
        setStatus('OFFLINE_QUEUED');
        return { offline: true };
      }

      try {
        const idempotencyKey = `tu_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const { order } = await paymentService.createOrder({
          amount,
          customerId,
          idempotencyKey,
          description,
        });

        setStatus(order.status);
        pollStatus(order.orderUuid);

        const Razorpay = await paymentService.loadRazorpayScript();
        const rzp = new Razorpay({
          key: order.razorpayKeyId,
          amount: order.amountPaise,
          currency: order.currency || 'INR',
          name: 'Thumbs Up Distribution',
          description: description || 'UPI Payment',
          order_id: order.razorpayOrderId,
          method: { upi: true },
          handler: async (response) => {
            setStatus('VERIFYING');
            try {
              const verified = await paymentService.verifyPayment({
                orderUuid: order.orderUuid,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              setStatus(verified.status || 'SUCCESS');
              onSuccess?.(verified);
            } catch (err) {
              setError(err.message || 'Verification failed');
              setStatus('FAILED');
            }
          },
          modal: {
            ondismiss: () => setStatus('CANCELLED'),
          },
        });
        rzp.open();
        return { order };
      } catch (err) {
        setError(err.message || 'Payment failed');
        setStatus('FAILED');
        throw err;
      }
    },
    [online, pollStatus]
  );

  return { payWithUpi, status, error, setStatus };
}
