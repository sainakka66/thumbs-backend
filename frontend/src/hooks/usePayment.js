import { useCallback, useEffect, useRef, useState } from 'react';
import * as paymentService from '../services/paymentService';
import { usePaymentSocket } from './usePaymentSocket';
import { queueOfflinePayment, flushOfflinePaymentQueue } from '../lib/offlinePaymentQueue';
import { useOnlineStatus } from './useOnlineStatus';
import { openUpiCheckout } from '../lib/razorpayUpiCheckout';

const POLL_MS = 4000;

const ACTIVE_PAYMENT_STATUSES = new Set([
  'CREATING',
  'INITIATED',
  'VERIFYING',
  'AWAITING_CONFIRMATION',
  'PROCESSING',
]);

export function usePayment() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [gatewayReady, setGatewayReady] = useState(null);
  const [checkoutTier, setCheckoutTier] = useState(null);
  const [checkoutAttempt, setCheckoutAttempt] = useState(0);
  const [checkoutExhausted, setCheckoutExhausted] = useState(false);
  const pollRef = useRef(null);
  const online = useOnlineStatus();

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const pollStatus = useCallback(
    (orderUuid, onSuccess) => {
      stopPolling();
      pollRef.current = setInterval(async () => {
        try {
          const res = await paymentService.getPaymentStatus(orderUuid);
          const s = res.order?.status;
          const stage = res.order?.lifecycleStage;
          if (s === 'SUCCESS' || stage === 'SETTLED') {
            setStatus('SUCCESS');
            stopPolling();
            onSuccess?.({ status: 'SUCCESS', lifecycleStage: stage });
          } else if (s && ['FAILED', 'CANCELLED', 'BLOCKED', 'REFUNDED'].includes(s)) {
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

  const socketEnabled = ACTIVE_PAYMENT_STATUSES.has(status);
  usePaymentSocket(
    useCallback((payload) => {
      if (payload?.status) setStatus(payload.status);
    }, []),
    socketEnabled
  );

  useEffect(() => {
    if (!online) return;
    flushOfflinePaymentQueue().catch(() => {});
  }, [online]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const payWithUpi = useCallback(
    async ({ amount, customerId, description, onSuccess }) => {
      setError(null);
      setCheckoutExhausted(false);
      setCheckoutTier(null);
      setCheckoutAttempt(0);
      setStatus('CREATING');

      if (!online) {
        await queueOfflinePayment({ amount, customerId, description });
        setStatus('OFFLINE_QUEUED');
        return { offline: true };
      }

      try {
        let health;
        try {
          health = await paymentService.getGatewayHealth();
          setGatewayReady(health?.ready ?? false);
        } catch {
          setGatewayReady(null);
        }

        if (health && health.ready === false) {
          throw new Error(health.message || 'Payment gateway not configured.');
        }

        const idempotencyKey = `tu_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const { order } = await paymentService.createOrder({
          amount,
          customerId,
          idempotencyKey,
          description,
        });

        if (!order?.razorpayKeyId || !order?.razorpayOrderId) {
          setGatewayReady(false);
          throw new Error('Payment gateway not configured. Contact admin.');
        }

        setGatewayReady(true);
        setStatus('INITIATED');
        pollStatus(order.orderUuid, onSuccess);

        const Razorpay = await paymentService.loadRazorpayScript();

        const checkoutResult = await openUpiCheckout(Razorpay, {
          order,
          description,
          onTierChange: (tierId, attempt, total) => {
            setCheckoutTier(tierId);
            setCheckoutAttempt(attempt);
            if (attempt > 1) setStatus('PROCESSING');
          },
          onPaid: async (response) => {
            setStatus('VERIFYING');
            try {
              await paymentService.verifyPayment({
                orderUuid: order.orderUuid,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              setStatus('AWAITING_CONFIRMATION');
              pollStatus(order.orderUuid, onSuccess);
            } catch (err) {
              setError(err.message || 'Verification failed');
              setStatus('FAILED');
            }
          },
          onDismiss: () => setStatus('CANCELLED'),
          onFailed: (msg) => {
            setError(msg);
            setStatus('FAILED');
          },
        });

        if (checkoutResult.dismissed) {
          setStatus('CANCELLED');
          return { cancelled: true };
        }

        if (checkoutResult.failed) {
          if (checkoutResult.exhausted) {
            setCheckoutExhausted(true);
          }
          setError(checkoutResult.error || 'UPI payment unavailable');
          setStatus('FAILED');
          throw new Error(checkoutResult.error || 'UPI payment unavailable');
        }

        return { order, tier: checkoutResult.tier };
      } catch (err) {
        const msg = err.message || 'Payment failed';
        setError(msg);
        setStatus('FAILED');
        throw err;
      }
    },
    [online, pollStatus]
  );

  return {
    payWithUpi,
    status,
    error,
    setStatus,
    gatewayReady,
    checkoutTier,
    checkoutAttempt,
    checkoutExhausted,
  };
}
