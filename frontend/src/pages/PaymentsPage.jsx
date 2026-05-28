import { useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import * as paymentService from '../services/paymentService';
import { useToast } from '../context/ToastContext';
import { usePaymentSocket } from '../hooks/usePaymentSocket';

const statusVariant = {
  SUCCESS: 'success',
  FAILED: 'danger',
  PENDING: 'warning',
  INITIATED: 'info',
  BLOCKED: 'danger',
  FLAGGED_FOR_REVIEW: 'warning',
};

export default function PaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);

  const load = async () => {
    try {
      const res = await paymentService.getPaymentHistory({ limit: 50 });
      setPayments(res.payments || []);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  usePaymentSocket(() => load());

  return (
    <div>
      <PageHeader title="Payment History" subtitle="UPI transactions and settlement status" />
      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-border bg-ink/50 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">UPI Ref</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border/60">
                  <td className="px-4 py-3 text-sub">
                    {new Date(p.created_at).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{p.order_uuid?.slice(0, 8)}…</td>
                  <td className="px-4 py-3">₹{Number(p.amount_inr).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[p.status] || 'default'}>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {p.upi_transaction_ref || p.razorpay_payment_id || '—'}
                  </td>
                </tr>
              ))}
              {!payments.length && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sub">
                    No payments yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
