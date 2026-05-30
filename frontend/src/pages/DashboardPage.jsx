import { Link } from 'react-router-dom';
import {
  IndianRupee, TrendingUp, CalendarRange, Store, Clock, Truck,
  CheckCircle2, AlertTriangle, Users, BellRing, Plus, ArrowUpRight,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { fmt } from '../lib/format';
import SimpleBarChart from '../components/charts/SimpleBarChart';
import { SkeletonStatGrid, SkeletonCard, SkeletonChart } from '../components/ui/Skeleton';
import { useDashboardSummary } from '../hooks/useDashboard';
import { useCountUp } from '../hooks/useCountUp';

function HeroRevenue({ amount }) {
  const animated = useCountUp(amount, 800);
  return (
    <div className="surface-card mb-6 overflow-hidden p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-wide text-muted">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand/12 text-brand">
              <IndianRupee size={15} strokeWidth={2.4} />
            </span>
            Weekly Revenue
          </div>
          <div className="mt-2 font-head text-[clamp(2rem,8vw,3rem)] font-extrabold leading-none text-text">
            {fmt(Math.round(animated))}
          </div>
        </div>
        <Link
          to="/reports"
          className="inline-flex items-center gap-1 rounded-xl bg-surface2 px-3 py-2 text-sm font-semibold text-sub hover:text-text"
        >
          View reports <ArrowUpRight size={15} />
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboardSummary();

  // Skeletons instead of a blank screen while the single summary request resolves.
  if (isLoading) {
    return (
      <div className="page-container pb-20 lg:pb-0">
        <PageHeader title="Executive Dashboard" subtitle="Loading real-time performance…" />
        <SkeletonStatGrid count={8} />
        <div className="dash-grid">
          <Card><CardHeader title="Weekly sales (7 days)" /><CardBody><SkeletonChart /></CardBody></Card>
          <Card><CardHeader title="Sales trend (14 days)" /><CardBody><SkeletonChart /></CardBody></Card>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (isError && !data) {
    return (
      <div className="page-container pb-20 lg:pb-0">
        <PageHeader title="Dashboard" subtitle={error?.message || 'Failed to load dashboard'} />
      </div>
    );
  }

  const d = data || {};
  const adminData = d.admin || null;
  const weeklySales = Array.isArray(d.weeklySales) ? d.weeklySales : [];
  const salesTrend = Array.isArray(d.charts?.salesTrend) ? d.charts.salesTrend : [];
  const revenueTrend = Array.isArray(d.charts?.revenueTrend) ? d.charts.revenueTrend : [];
  const deliveryPerf = Array.isArray(d.charts?.deliveryPerformance) ? d.charts.deliveryPerformance : [];
  const topProducts = Array.isArray(d.topProducts) ? d.topProducts : [];
  const lowStockProducts = Array.isArray(d.lowStockProducts) ? d.lowStockProducts : [];

  return (
    <div className="page-container pb-20 lg:pb-0">
      <PageHeader title="Executive Dashboard" subtitle="Real-time distribution performance" />

      <HeroRevenue amount={Number(d.revenue?.week || 0)} />

      <div className="stat-grid mb-6">
        <StatCard label="Today's Sales" value={fmt(d.todaySales?.total)} icon={IndianRupee} accent="green" sub={`${d.todaySales?.count || 0} orders`} />
        <StatCard label="Monthly Revenue" value={fmt(d.revenue?.month)} icon={CalendarRange} accent="blue" />
        <StatCard label="Total Customers" value={d.customers?.total ?? '—'} icon={Store} />
        <StatCard label="Active (with dues)" value={d.customers?.active ?? '—'} icon={Clock} accent="amber" />
        <StatCard label="Pending Deliveries" value={d.deliveries?.pending ?? '—'} icon={Truck} accent="amber" />
        <StatCard label="Completed Deliveries" value={d.deliveries?.completed ?? '—'} icon={CheckCircle2} accent="green" />
        <StatCard label="Low Stock Items" value={lowStockProducts.length || '—'} icon={AlertTriangle} accent="amber" />
        <StatCard label="Weekly Trend" value={fmt(d.revenue?.week)} icon={TrendingUp} accent="brand" />
      </div>

      {adminData && (
        <>
          <PageHeader title="Admin Overview" subtitle="Enterprise control panel" />
          <div className="stat-grid mb-6">
            <StatCard label="Total Users" value={adminData.users?.total ?? '—'} icon={Users} />
            <StatCard label="Active Users" value={adminData.users?.active ?? '—'} icon={CheckCircle2} accent="green" />
            <StatCard label="Low Stock Alerts" value={adminData.lowStockCount ?? '—'} icon={AlertTriangle} accent="amber" />
            <StatCard label="Unread Notifications" value={adminData.unreadNotifications ?? '—'} icon={BellRing} accent="blue" />
            <StatCard label="Sales Today" value={adminData.salesToday?.count ?? '—'} icon={IndianRupee} sub={fmt(adminData.salesToday?.revenue)} />
            <StatCard label="Revenue Today" value={fmt(adminData.salesToday?.revenue)} icon={IndianRupee} accent="green" />
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

      {lowStockProducts.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="Low stock alerts" />
          <CardBody>
            <ul className="divide-y divide-border text-sm">
              {lowStockProducts.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <span className="flex items-center gap-2">
                    <AlertTriangle size={15} className="text-warning" />
                    {p.name}
                  </span>
                  <span className="font-semibold text-warning">
                    {p.stock} / {p.threshold}
                  </span>
                </li>
              ))}
            </ul>
            <Link to="/inventory" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
              Manage inventory <ArrowUpRight size={14} />
            </Link>
          </CardBody>
        </Card>
      )}

      <div className="dash-grid">
        <Card>
          <CardHeader title="Weekly sales (7 days)" />
          <CardBody>
            <SimpleBarChart
              data={weeklySales.map((r) => ({
                date: r.day,
                amount: r.total,
              }))}
              valueKey="amount"
              labelKey="date"
              height={140}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Sales trend (14 days)" />
          <CardBody>
            <SimpleBarChart data={salesTrend} valueKey="amount" labelKey="date" height={140} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Revenue trend" />
          <CardBody>
            <SimpleBarChart data={revenueTrend} valueKey="amount" labelKey="date" height={140} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Top products (30d)" />
          <CardBody>
            {!topProducts.length ? (
              <p className="text-sm text-muted">No sales data</p>
            ) : (
              <ul className="space-y-2">
                {topProducts.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 truncate">
                      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-surface2 text-[0.65rem] font-bold text-muted">
                        {i + 1}
                      </span>
                      <span className="truncate">{p.name}</span>
                    </span>
                    <span className="font-bold text-success">{fmt(p.revenue)}</span>
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
              data={deliveryPerf.map((r) => ({
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
        <Link to="/sales" className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white">
          <Plus size={16} /> Quick sale
        </Link>
        <Link to="/customers" className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-sub">
          <Plus size={16} /> Customer
        </Link>
      </div>
    </div>
  );
}
