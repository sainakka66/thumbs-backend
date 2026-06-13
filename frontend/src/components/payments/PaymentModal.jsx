import { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input } from '../ui/Field';
import { usePayment } from '../../hooks/usePayment';
import { useToast } from '../../context/ToastContext';
import PaymentIssuePanel from './PaymentIssuePanel';

export default function PaymentModal({ open, onClose, customer, onSuccess }) {
  const { toast } = useToast();
  const {
    payWithUpi,
    status,
    error,
    gatewayReady,
    gatewayMode,
    checkoutTier,
    checkoutAttempt,
    checkoutExhausted,
  } = usePayment();
  const [amount, setAmount] = useState(() =>
    customer?.outstanding_balance ? String(Number(customer.outstanding_balance)) : ''
  );

  const busy = ['CREATING', 'VERIFYING', 'AWAITING_CONFIRMATION', 'INITIATED', 'PROCESSING'].includes(
    status
  );

  useEffect(() => {
    if (open && customer?.outstanding_balance != null) {
      setAmount(String(Number(customer.outstanding_balance)));
    }
  }, [open, customer?.id, customer?.outstanding_balance]);

  const handlePay = async () => {
    const value = parseFloat(amount);
    if (!value || value <= 0) {
      toast('Enter a valid amount', 'error');
      return;
    }
    try {
      const result = await payWithUpi({
        amount: value,
        customerId: customer?.id,
        description: `Payment — ${customer?.shop_name || 'Customer'}`,
        onSuccess: () => {
          toast('UPI payment successful ✅', 'success');
          onSuccess?.();
          onClose();
        },
      });
      if (result?.offline) {
        toast('Offline — payment queued until reconnect', 'info');
        onClose();
      }
    } catch (e) {
      toast(e.message || 'Payment failed', 'error');
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="UPI Payment" wide>
      <p className="mb-4 text-sm text-sub">
        Real-time UPI — pay instantly via GPay, PhonePe, Paytm, or any UPI app. Secured by Razorpay.
      </p>
      {gatewayMode === 'test' && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
          <p className="font-semibold">Test Mode — UPI not on your Razorpay account yet</p>
          <p className="mt-1 opacity-90">
            Your Payment Configuration shows Cards/Netbanking only (no UPI). You must{' '}
            <strong>activate your Razorpay account</strong> first, then request UPI under{' '}
            <strong>Account &amp; Settings → Payment Methods</strong>.
          </p>
          <p className="mt-2 opacity-90">
            Until UPI appears: checkout may fall back to Cards. Use test card{' '}
            <code className="rounded bg-black/30 px-1">4111 1111 1111 1111</code> (any future expiry, any CVV) to
            verify the payment pipeline. Once UPI is enabled, use <code className="rounded bg-black/30 px-1">success@razorpay</code>.
          </p>
        </div>
      )}
      {customer && (
        <p className="mb-3 text-sm font-medium text-text">
          {customer.shop_name} · Due ₹{Number(customer.outstanding_balance || 0).toLocaleString('en-IN')}
        </p>
      )}
      <Field label="Amount (₹)">
        <Input
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
      </Field>

      <PaymentIssuePanel
        status={status}
        error={error}
        gatewayReady={gatewayReady}
        checkoutExhausted={checkoutExhausted}
        checkoutTier={checkoutTier}
        checkoutAttempt={checkoutAttempt}
      />

      <div className="mt-4 flex gap-2">
        <Button onClick={handlePay} disabled={busy}>
          {busy ? 'Processing…' : 'Pay with UPI'}
        </Button>
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
