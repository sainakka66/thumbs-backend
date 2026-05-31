import { useQuery } from '@tanstack/react-query';
import PageHeader from '../../components/ui/PageHeader';
import { Card, CardBody } from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import { fetchRiskDashboard } from '../../services/securityService';

export default function RiskDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ['risk-dashboard'], queryFn: fetchRiskDashboard });

  if (isLoading) return <p className="p-6 text-muted">Loading risk dashboard…</p>;

  const caps = data?.capabilities || {};
  const providers = data?.providers || {};

  return (
    <div className="page-container space-y-6">
      <PageHeader title="Risk dashboard" subtitle="Login scoring, device trust, and fraud providers" />
      <div className="grid gap-4 md:grid-cols-3">
        <Card><CardBody><div className="text-sm text-muted">Failed logins (24h)</div><div className="font-head text-2xl font-bold">{data?.metrics?.failedLogins24h}</div></CardBody></Card>
        <Card><CardBody><div className="text-sm text-muted">Blocked devices</div><div className="font-head text-2xl font-bold">{data?.metrics?.blockedDevices}</div></CardBody></Card>
        <Card><CardBody><div className="text-sm text-muted">Your login risk</div><div className="font-head text-2xl font-bold">{data?.metrics?.currentLoginRisk?.riskScore ?? 0}</div></CardBody></Card>
      </div>
      <Card>
        <CardBody>
          <h3 className="mb-3 font-bold">Capability matrix</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {Object.entries(caps).map(([k, v]) => (
              <li key={k} className="flex justify-between rounded-lg border border-border px-3 py-2 text-sm">
                <span>{k}</span>
                <Badge tone={v === 'implemented' ? 'success' : v === 'partial' ? 'warning' : 'danger'}>{v}</Badge>
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
      <Card>
        <CardBody>
          <h3 className="mb-3 font-bold">Providers</h3>
          <ul className="space-y-2 text-sm">
            {Object.entries(providers).map(([name, p]) => (
              <li key={name}>{name}: {p.status} {p.enabled ? '(on)' : '(off)'}</li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
