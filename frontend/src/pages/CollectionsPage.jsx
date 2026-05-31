import { useQuery } from '@tanstack/react-query';
import { apiJson } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardBody } from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import { IndianRupee, Wallet } from 'lucide-react';
import { fmt } from '../lib/format';

function fetchDues() {
  return apiJson('/collections/dues/dashboard');
}

export default function CollectionsPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dues-dashboard'], queryFn: fetchDues });

  const summary = data?.summary || {};

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Collections & Dues" subtitle="Outstanding balances, aging, and payment tracking" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total outstanding" value={fmt(summary.total_outstanding)} icon={IndianRupee} loading={isLoading} />
        <StatCard label="Customers with dues" value={summary.customers_with_due ?? '—'} icon={Wallet} loading={isLoading} />
        <StatCard label="Over credit limit" value={summary.over_limit_count ?? '—'} icon={Wallet} accent="warning" loading={isLoading} />
      </div>
      <Card>
        <CardBody>
          <h3 className="mb-4 font-bold text-text">Due aging</h3>
          <div className="grid gap-2 sm:grid-cols-4">
            {(data?.aging || []).map((b) => (
              <div key={b.bucket} className="rounded-xl border border-border p-3 text-center">
                <div className="text-xs font-semibold uppercase text-muted">{b.bucket} days</div>
                <div className="mt-1 font-head text-lg font-bold">{fmt(b.amount)}</div>
                <div className="text-xs text-sub">{b.customers} customers</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-muted">
            Record collections via API POST /collections. UPI QR: GET /collections/upi-qr/:customerId.
            WhatsApp/SMS/email reminders are feature-flagged (off by default).
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
