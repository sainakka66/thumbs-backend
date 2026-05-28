import { useEffect, useState } from 'react';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import * as paymentService from '../../services/paymentService';
import { useToast } from '../../context/ToastContext';

export default function AdminFraudPage() {
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [webhooks, setWebhooks] = useState([]);

  const load = async () => {
    try {
      const [fraud, wh] = await Promise.all([
        paymentService.adminFraudQueue(),
        paymentService.adminWebhooks(),
      ]);
      setItems(fraud.items || []);
      setWebhooks(wh.webhooks || []);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const blockUser = async (userId) => {
    if (!window.confirm('Block this user from payments?')) return;
    try {
      await paymentService.blockUser(userId, 'Fraud review block');
      toast('User blocked', 'success');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader title="Fraud Review" subtitle="Suspicious activity queue & webhook logs" />
      <Card>
        <CardBody>
          <h3 className="mb-4 font-head text-lg font-bold text-text">Review queue</h3>
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3"
              >
                <div>
                  <p className="font-medium text-text">{item.activity_type}</p>
                  <p className="text-sm text-sub">
                    {item.username || '—'} · score {item.risk_score} ·{' '}
                    {new Date(item.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={item.severity === 'critical' ? 'danger' : 'warning'}>
                    {item.severity}
                  </Badge>
                  {item.user_id && (
                    <Button size="sm" variant="ghost" onClick={() => blockUser(item.user_id)}>
                      Block user
                    </Button>
                  )}
                </div>
              </li>
            ))}
            {!items.length && <p className="text-sub">No pending reviews</p>}
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardBody className="overflow-x-auto p-0">
          <h3 className="border-b border-border px-4 py-3 font-head text-lg font-bold text-text">
            Webhook logs
          </h3>
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr>
                <th className="px-4 py-2">Event</th>
                <th className="px-4 py-2">Valid</th>
                <th className="px-4 py-2">Processed</th>
                <th className="px-4 py-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((w) => (
                <tr key={w.id} className="border-t border-border/60">
                  <td className="px-4 py-2">{w.event_type}</td>
                  <td className="px-4 py-2">{w.signature_valid ? '✓' : '✗'}</td>
                  <td className="px-4 py-2">{w.processed ? '✓' : '—'}</td>
                  <td className="px-4 py-2 text-sub">
                    {new Date(w.created_at).toLocaleString('en-IN')}
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
