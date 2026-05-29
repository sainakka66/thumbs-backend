import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { fmt } from '../lib/format';
import * as businessService from '../services/businessService';
import SimpleBarChart from '../components/charts/SimpleBarChart';
import { useAuth } from '../context/AuthContext';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [adminData, setAdminData] = useState(null);
  const [error, setError] = useState('');
  const { hasPermission } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const exec = await businessService.fetchExecutiveDashboard();
        setData(exec);
        if (hasPermission('users.manage')) {
          const admin = await businessService.fetchAdminDashboard().catch(() => null);
          setAdminData(admin);
        }
        await businessService.syncStockAlerts().catch(() => {});
      } catch (e) {
        setError(e.message || 'Failed to load dashboard');
      }
    })();
  }, [hasPermission]);

  if (error && !data) {
    return (
      <div className="page-container pb-20 lg:pb-0">
        <PageHeader title="Dashboard" subtitle={error} />
      </div>
    );
  }

  const d = data || {};

  return (
    <div className="page-container pb-20 lg:pb-0">
      <PageHeader title="Executive Dashboard" subtitle="Real-time distribution performance" />

      {adminData && (
        <>
          <PageHeader title="Admin Overview" subtitle="Enterprise control panel" />
          <div className="stat-grid mb-6">
            <StatCard label="Total Users" value={adminData.users?.total ?? '—'} icon="👥" />
            <StatCard label="Active Users" value={adminData.users?.active ?? '—'} icon="✓" accent="green" />
            <StatCard label="Low Stock Alerts" value={adminData.lowStockCount ?? '—'} icon="⚠️" accent="amber" />
            <StatCard label="Unread Notifications" value={adminData.unreadNotifications ?? '—'} icon="🔔" />
            <StatCard label="Sales Today" value={adminData.salesToday?.count ?? '—'} icon="💰" sub={fmt(adminData.salesToday?.revenue)} />
            <StatCard label="Revenue Today" value={fmt(adminData.salesToday?.revenue)} icon="💵" accent="green" />
          </div>
          {adminData.recentAudit?.length > 0 && (
            <Card className="mb-6">
              <CardHeader title="Recent audit events" />
              <CardBody>
                <ul className="space-y-2 text-sm">
                  {adminData.recentAudit.map((a) => (
                    <li key={a.id} className="flex justify-between gap-2">
                      <span className="font-mono text-xs">{a.action}</span>
                      <span className="text-muted">{a.username} · {new Date(a.created_at).toLocaleString('en-IN')}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/admin/audit" className="mt-3 inline-block text-sm text-brand">
                  Full audit trail →
                </Link>
              </CardBody>
            </Card>
          )}
        </>
      )}

      <div className="stat-grid mb-6">
        <StatCard label="Today's Sales" value={fmt(d.todaySales?.total)} icon="💵" accent="green" sub={`${d.todaySales?.count || 0} orders`} />
        <StatCard label="Weekly Revenue" value={fmt(d.revenue?.week)} icon="📈" accent="blue" />
        <StatCard label="Monthly Revenue" value={fmt(d.revenue?.month)} icon="📊" />
        <StatCard label="Total Customers" value={d.customers?.total ?? '—'} icon="🏪" />
        <StatCard label="Active (with dues)" value={d.customers?.active ?? '—'} icon="⏳" accent="amber" />
        <StatCard label="Pending Deliveries" value={d.deliveries?.pending ?? '—'} icon="🚚" accent="amber" />
        <StatCard label="Completed Deliveries" value={d.deliveries?.completed ?? '—'} icon="✅" accent="green" />
        <StatCard label="Low Stock Items" value={d.lowStockProducts?.length ?? '—'} icon="⚠️" accent="amber" />
      </div>

      {d.lowStockProducts?.length > 0 && (
        <Card className="mb-6 border-amber-500/30">
          <CardHeader title="Low stock alerts" />
          <CardBody>
            <ul className="space-y-2 text-sm">
              {d.lowStockProducts.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{p.name}</span>
                  <span className="text-amber-400">
                    {p.stock} / threshold {p.threshold}
                  </span>
                </li>
              ))}
            </ul>
            <Link to="/inventory" className="mt-3 inline-block text-sm text-brand">
              Manage inventory →
            </Link>
          </CardBody>
        </Card>
      )}

      <div className="dash-grid">
        <Card>
          <CardHeader title="Sales trend (14 days)" />
          <CardBody>
            <SimpleBarChart data={d.charts?.salesTrend || []} valueKey="amount" labelKey="date" height={140} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Revenue trend" />
          <CardBody>
            <SimpleBarChart data={d.charts?.revenueTrend || []} valueKey="amount" labelKey="date" height={140} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Top products (30d)" />
          <CardBody>
            {!d.topProducts?.length ? (
              <p className="text-sm text-muted">No sales data</p>
            ) : (
              <ul className="space-y-2">
                {d.topProducts.map((p, i) => (
                  <li key={i} className="flex justify-between text-sm">
                    <span>{p.name}</span>
                    <span className="font-bold text-green-400">{fmt(p.revenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Delivery performance" />
          <CardBody>
            <SimpleBarChart
              data={(d.charts?.deliveryPerformance || []).map((r) => ({
                date: r.date,
                amount: r.completed,
              }))}
              valueKey="amount"
              labelKey="date"
              height={120}
            />
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 lg:hidden">
        <Link to="/sales" className="rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white">
          + Quick sale
        </Link>
        <Link to="/customers" className="rounded-lg border border-border px-4 py-3 text-sm">
          + Customer
        </Link>
      </div>
    </div>
  );
}
