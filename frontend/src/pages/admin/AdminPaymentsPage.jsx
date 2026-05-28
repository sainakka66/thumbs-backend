import { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import * as paymentService from '../../services/paymentService';
import { useToast } from '../../context/ToastContext';
import { usePaymentSocket } from '../../hooks/usePaymentSocket';

export default function AdminPaymentsPage() {
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState([]);

  const load = async () => {
    try {
      const res = await paymentService.adminMonitor({ limit: 100 });
      setPayments(res.payments || []);
      setStats(res.weeklyStats || []);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  usePaymentSocket(() => load());

  const handleRefund = async (orderUuid) => {
    if (!window.confirm('Initiate refund for this order?')) return;
    try {
      await paymentService.initiateRefund({ orderUuid, reason: 'Admin refund' });
      toast('Refund initiated', 'success');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div>
      <PageHeader title="Payment Monitoring" subtitle="Admin settlement & transaction oversight" />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.status}>
            <CardBody>
              <p className="text-xs uppercase text-muted">{s.status}</p>
              <p className="font-head text-xl font-bold text-text">{s.cnt}</p>
              <p className="text-sm text-sub">₹{Number(s.total || 0).toLocaleString('en-IN')}</p>
            </CardBody>
          </Card>
        ))}
      </div>
      <Card>
        <CardBody className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-border bg-ink/50 text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border/60">
                  <td className="px-4 py-3">{p.username}</td>
                  <td className="px-4 py-3">{p.customer_name || '—'}</td>
                  <td className="px-4 py-3">₹{Number(p.amount_inr).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <Badge>{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3">{Number(p.risk_score).toFixed(0)}</td>
                  <td className="px-4 py-3">
                    {p.status === 'SUCCESS' && (
                      <Button size="sm" variant="ghost" onClick={() => handleRefund(p.order_uuid)}>
                        Refund
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
