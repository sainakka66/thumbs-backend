import { useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import StatCard from '../components/ui/StatCard';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import { fmt } from '../lib/format';
import * as dashboardService from '../services/dashboardService';
import * as productService from '../services/productService';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [topCustomers, setTopCustomers] = useState([]);
  const [revenue, setRevenue] = useState(0);
  const [weekly, setWeekly] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, r, t, rev, w, prods] = await Promise.all([
          productService.fetchProductStats(),
          dashboardService.fetchRecentSales(),
          dashboardService.fetchTopCustomers(),
          dashboardService.fetchTodayRevenue(),
          dashboardService.fetchWeeklySales(),
          productService.fetchProducts(1, ''),
        ]);
        setStats(s);
        setRecent(r);
        setTopCustomers(t);
        setRevenue(Number(rev?.todayRevenue) || 0);
        setProducts(prods.slice(0, 6));

        const map = {};
        w.forEach((d) => {
          map[d.day] = Number(d.total) || 0;
        });
        setWeekly(DAYS.map((d) => ({ label: d.slice(0, 3), rev: map[d] || 0 })));
      } catch (e) {
        console.error('Dashboard load:', e);
      }
    })();
  }, []);

  const maxRev = Math.max(...weekly.map((d) => d.rev), 1);

  return (
    <div className="page-container">
      <PageHeader title="Dashboard" subtitle="Overview of your distribution operations" />

      <div className="stat-grid mb-6">
        <StatCard label="Total Products" value={stats?.totalProducts ?? '—'} icon="📦" />
        <StatCard label="Total Stock (Cases)" value={stats?.totalStock ?? '—'} icon="📊" accent="green" />
        <StatCard label="Low Stock" value={stats?.lowStock ?? '—'} icon="⚠️" accent="amber" />
        <StatCard
          label="Total Value"
          value={'₹ ' + Number(stats?.totalValue || 0).toLocaleString('en-IN')}
          icon="💰"
          accent="blue"
        />
        <StatCard label="Today's Revenue" value={fmt(revenue)} icon="💵" accent="green" />
        <StatCard label="Deliveries Today" value="—" icon="🚚" accent="blue" sub="From delivery log" />
        <StatCard label="Outstanding Dues" value="—" icon="⏳" accent="amber" sub="See customers" />
      </div>

      <div className="dash-grid">
        <Card>
          <CardHeader title="Weekly Sales" />
          <CardBody>
            <div className="flex h-28 items-end gap-2 px-1">
              {weekly.map((d) => (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full min-h-[4px] rounded-t bg-brand"
                    style={{ height: `${Math.max(4, (d.rev / maxRev) * 100)}px` }}
                    title={fmt(d.rev)}
                  />
                  <span className="w-full truncate text-center text-[0.65rem] text-muted">{d.label}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Stock Levels" />
          <CardBody>
            {!products.length ? (
              <p className="text-sm italic text-muted">No products added</p>
            ) : (
              <ul className="space-y-3">
                {products.map((p) => {
                  const pct = p.reorder > 0 ? Math.min(100, (p.stock / p.reorder) * 100) : 100;
                  const color = p.stock <= p.reorder ? 'bg-amber-500' : 'bg-green-500';
                  return (
                    <li key={p.id}>
                      <div className="flex justify-between text-sm">
                        <span>{p.name}</span>
                        <span className="text-muted">{p.stock} cases</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded bg-border">
                        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent Activity" />
          <CardBody>
            {!recent.length ? (
              <p className="text-sm italic text-muted">No recent sales</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recent.map((s) => (
                  <li key={s.id} className="flex gap-2 border-b border-border/50 py-2">
                    <span>💰</span>
                    <div className="min-w-0 flex-1">
                      <div>
                        Sale: {s.customer_name || 'Unknown'} — {fmt(s.total_amount)}
                      </div>
                      <div className="text-xs text-muted">
                        {s.created_at ? new Date(s.created_at).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Top Customers" />
          <CardBody>
            {!topCustomers.length ? (
              <p className="text-sm italic text-muted">No customers yet</p>
            ) : (
              <ul className="space-y-2">
                {topCustomers.map((c, i) => (
                  <li
                    key={c.id || i}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
                        {i + 1}
                      </span>
                      <div>
                        <div className="text-sm font-semibold">{c.customer_name || c.shop_name || '—'}</div>
                      </div>
                    </div>
                    <div className="text-right text-sm font-bold text-green-400">
                      {fmt(c.total || 0)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
