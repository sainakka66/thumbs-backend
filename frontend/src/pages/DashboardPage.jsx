import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  IndianRupee, ShoppingCart, Truck, UserPlus, TrendingUp, Trophy,
  AlertTriangle, Users, CheckCircle2, BellRing, Plus, ArrowUpRight,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { fmt } from '../lib/format';
import SimpleBarChart from '../components/charts/SimpleBarChart';
import Donut from '../components/charts/Donut';
import { SkeletonStatGrid, SkeletonCard, SkeletonChart } from '../components/ui/Skeleton';
import { useDashboardSummary } from '../hooks/useDashboard';
import { useCountUp } from '../hooks/useCountUp';

const PERIODS = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
];

function RevenueSection({ d }) {
  const [period, setPeriod] = useState('week');
  const value =
    period === 'day' ? Number(d.revenue?.today || 0)
      : period === 'week' ? Number(d.revenue?.week || 0)
        : Number(d.revenue?.month || 0);
  const animated = useCountUp(value, 800);

  const weekly = (d.weeklySales || []).map((r) => ({ date: r.day, amount: r.total }));
  const trend = d.charts?.salesTrend || [];
  const chartData = period === 'week' ? weekly : trend;

  return (
    <div className="surface-card mb-4 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-wide text-muted">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand/12 text-brand">
              <IndianRupee size={15} strokeWidth={2.4} />
            </span>
            {period === 'day' ? "Today's Revenue" : period === 'week' ? 'This Week' : 'This Month'}
          </div>
          <div className="mt-2 font-head text-[clamp(2rem,8vw,3rem)] font-extrabold leading-none text-text">
            {fmt(Math.round(animated))}
          </div>
        </div>
        <div className="inline-flex rounded-xl bg-surface2 p-1" role="tablist" aria-label="Revenue period">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={period === p.key}
              onClick={() => setPeriod(p.key)}
              className={`min-h-[36px] rounded-lg px-3 text-sm font-semibold transition-colors ${
                period === p.key ? 'bg-surface text-brand shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <SimpleBarChart data={chartData} valueKey="amount" labelKey="date" height={170} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError, error } = useDashboardSummary();

  if (isLoading) {
    return (
      <div className="page-container pb-20 lg:pb-0">
        <PageHeader title="Executive Dashboard" subtitle="Loading real-time performance…" />
        <SkeletonCard />
        <div className="mt-4"><SkeletonStatGrid count={4} /></div>
        <div className="dash-grid mt-4">
          <Card><CardHeader title="Delivery status" /><CardBody><SkeletonChart height={168} /></CardBody></Card>
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
  const topProducts = Array.isArray(d.topProducts) ? d.topProducts : [];
  const lowStockProducts = Array.isArray(d.lowStockProducts) ? d.lowStockProducts : [];
  const recentOrders = Array.isArray(d.recentOrders) ? d.recentOrders : [];
  const deliveryPerf = Array.isArray(d.charts?.deliveryPerformance) ? d.charts.deliveryPerformance : [];

  const delPending = Number(d.deliveries?.pending || 0);
  const delCompleted = Number(d.deliveries?.completed || 0);
  const delTotal = Number(d.deliveriesTotal || delPending + delCompleted);
  const delInProgress = Math.max(0, delTotal - delPending - delCompleted);

  // Performance bonus widget: progress of monthly revenue toward a display target.
  const monthRevenue = Number(d.revenue?.month || 0);
  const target = Math.max(100000, Math.ceil((monthRevenue * 1.25 || 100000) / 50000) * 50000);
  const bonusPct = Math.min(100, Math.round((monthRevenue / target) * 100));

  const maxProductRevenue = Math.max(...topProducts.map((p) => Number(p.revenue) || 0), 1);

  return (
    <div className="page-container pb-20 lg:pb-0">
      <PageHeader title="Executive Dashboard" subtitle="Real-time distribution performance" />

      <RevenueSection d={d} />

      {/* KPI cards */}
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={fmt(d.revenue?.month)} icon={IndianRupee} accent="brand" sub="last 30 days" />
        <StatCard label="Total Orders" value={d.ordersTotal ?? '—'} icon={ShoppingCart} accent="blue" sub={`${d.todaySales?.count || 0} today`} />
        <StatCard label="Total Deliveries" value={delTotal} icon={Truck} accent="amber" sub={`${delPending} pending`} />
        <StatCard label="New Customers" value={d.customers?.total ?? '—'} icon={UserPlus} accent="green" sub={`${d.customers?.active || 0} active`} />
      </div>

      {/* Delivery status + Performance bonus */}
      <div className="dash-grid">
        <Card>
          <CardHeader title="Delivery status" />
          <CardBody>
            {delTotal === 0 ? (
              <p className="text-sm text-muted">No deliveries yet</p>
            ) : (
              <Donut
                centerValue={delTotal}
                centerLabel="Total"
                segments={[
                  { label: 'Completed', value: delCompleted, className: 'stroke-success' },
                  { label: 'In progress', value: delInProgress, className: 'stroke-info' },
                  { label: 'Pending', value: delPending, className: 'stroke-warning' },
                ]}
              />
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Performance bonus">
            <Trophy size={16} className="text-warning" />
          </CardHeader>
          <CardBody>
            <p className="text-sm text-sub">Monthly revenue toward target</p>
            <div className="mt-3 flex items-end justify-between">
              <span className="font-head text-2xl font-extrabold text-text">{fmt(monthRevenue)}</span>
              <span className="text-sm text-muted">of {fmt(target)}</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-surface2">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light transition-[width] duration-700 ease-spring"
                style={{ width: `${bonusPct}%` }}
              />
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-sm">
              <TrendingUp size={15} className={bonusPct >= 100 ? 'text-success' : 'text-brand'} />
              <span className="font-semibold text-text">{bonusPct}%</span>
              <span className="text-muted">of monthly target {bonusPct >= 100 ? '— bonus unlocked!' : 'achieved'}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Recent orders + Top products */}
      <div className="dash-grid">
        <Card>
          <CardHeader title="Recent orders">
            <Link to="/sales" className="inline-flex items-center gap-1 text-sm font-semibold text-brand">
              View all <ArrowUpRight size={14} />
            </Link>
          </CardHeader>
          <CardBody flush>
            {!recentOrders.length ? (
              <p className="px-4 py-6 text-sm text-muted">No recent orders</p>
            ) : (
              <ul className="divide-y divide-border">
                {recentOrders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-text">{o.customerName || 'Walk-in'}</div>
                      <div className="truncate text-xs text-muted">{o.productName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-text">{fmt(o.amount)}</div>
                      <Badge tone={o.paymentMode === 'credit' ? 'amber' : 'green'}>
                        {o.paymentMode || 'cash'}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Top products (30d)" />
          <CardBody>
            {!topProducts.length ? (
              <p className="text-sm text-muted">No sales data</p>
            ) : (
              <ul className="space-y-3">
                {topProducts.map((p, i) => (
                  <li key={i} className="text-sm">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 truncate">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-surface2 text-[0.65rem] font-bold text-muted">{i + 1}</span>
                        <span className="truncate">{p.name}</span>
                      </span>
                      <span className="shrink-0 font-bold text-success">{fmt(p.revenue)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
                      <div
                        className="h-full rounded-full bg-brand transition-[width] duration-700 ease-spring"
                        style={{ width: `${Math.round(((Number(p.revenue) || 0) / maxProductRevenue) * 100)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      {lowStockProducts.length > 0 && (
        <Card>
          <CardHeader title="Low stock alerts" />
          <CardBody>
            <ul className="divide-y divide-border text-sm">
              {lowStockProducts.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2 first:pt-0 last:pb-0">
                  <span className="flex items-center gap-2"><AlertTriangle size={15} className="text-warning" />{p.name}</span>
                  <span className="font-semibold text-warning">{p.stock} / {p.threshold}</span>
                </li>
              ))}
            </ul>
            <Link to="/inventory" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
              Manage inventory <ArrowUpRight size={14} />
            </Link>
          </CardBody>
        </Card>
      )}

      {/* Admin overview (RBAC-gated, preserved) */}
      {adminData && (
        <>
          <PageHeader title="Admin Overview" subtitle="Enterprise control panel" />
          <div className="stat-grid mb-4">
            <StatCard label="Total Users" value={adminData.users?.total ?? '—'} icon={Users} />
            <StatCard label="Active Users" value={adminData.users?.active ?? '—'} icon={CheckCircle2} accent="green" />
            <StatCard label="Low Stock Alerts" value={adminData.lowStockCount ?? '—'} icon={AlertTriangle} accent="amber" />
            <StatCard label="Unread Notifications" value={adminData.unreadNotifications ?? '—'} icon={BellRing} accent="blue" />
          </div>
          {adminData.recentAudit?.length > 0 && (
            <Card>
              <CardHeader title="Recent audit events" />
              <CardBody>
                <ul className="divide-y divide-border text-sm">
                  {adminData.recentAudit.map((a) => (
                    <li key={a.id} className="flex justify-between gap-2 py-2 first:pt-0 last:pb-0">
                      <span className="font-mono text-xs text-text">{a.action}</span>
                      <span className="text-muted">{a.username} · {new Date(a.created_at).toLocaleString('en-IN')}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/admin/audit" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand">
                  Full audit trail <ArrowUpRight size={14} />
                </Link>
              </CardBody>
            </Card>
          )}
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-3 lg:hidden">
        <Link to="/sales" className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white">
          <Plus size={16} /> Quick sale
        </Link>
        <Link to="/customers" className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-3 text-sm font-semibold text-sub">
          <Plus size={16} /> Customer
        </Link>
      </div>

      {/* Delivery performance trend (kept) */}
      {deliveryPerf.length > 0 && (
        <Card className="mt-4">
          <CardHeader title="Delivery performance (14d)" />
          <CardBody>
            <SimpleBarChart
              data={deliveryPerf.map((r) => ({ date: r.date, amount: r.completed }))}
              valueKey="amount" labelKey="date" height={120}
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
