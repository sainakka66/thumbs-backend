import { useQuery } from '@tanstack/react-query';
import { apiJson } from '../services/api';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardBody } from '../components/ui/Card';

export default function SuppliersPage() {
  const { data: suppliers } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => apiJson('/suppliers'),
  });
  const { data: analytics } = useQuery({
    queryKey: ['purchase-analytics'],
    queryFn: () => apiJson('/suppliers/analytics/purchases'),
  });

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Suppliers" subtitle="Purchase orders, stock inward, and supplier ledger" />
      <Card>
        <CardBody>
          <h3 className="mb-3 font-bold text-text">Suppliers</h3>
          <ul className="divide-y divide-border text-sm">
            {(suppliers?.suppliers || []).map((s) => (
              <li key={s.id} className="flex justify-between py-2">
                <span className="font-medium">{s.name}</span>
                <span className="text-muted">{s.code}</span>
              </li>
            ))}
            {!suppliers?.suppliers?.length && <li className="text-muted">No suppliers yet — add via POST /suppliers</li>}
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h3 className="font-bold text-text">Purchase analytics (30d)</h3>
          <p className="mt-2 text-sm text-sub">
            PO count: {analytics?.totals?.po_count ?? 0} · Value: {analytics?.totals?.po_value ?? 0}
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
