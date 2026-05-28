import { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { Field, Input } from '../ui/Field';
import { usePayment } from '../../hooks/usePayment';
import { useToast } from '../../context/ToastContext';

export default function PaymentModal({ open, onClose, customer, onSuccess }) {
  const { toast } = useToast();
  const { payWithUpi, status, error } = usePayment();
  const [amount, setAmount] = useState('');

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
    <Modal open={open} onClose={onClose} title="UPI Payment">
      <p className="mb-4 text-sm text-sub">
        Pay via UPI (Intent / QR / Collect). Secured by Razorpay — keys never stored in the app.
      </p>
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
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      <p className="mt-2 text-xs text-muted">Status: {status}</p>
      <div className="mt-4 flex gap-2">
        <Button onClick={handlePay} disabled={['CREATING', 'VERIFYING'].includes(status)}>
          Pay with UPI
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
