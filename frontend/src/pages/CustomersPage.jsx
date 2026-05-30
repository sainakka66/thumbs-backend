import { useEffect, useMemo, useState } from 'react';
import { Eye, IndianRupee, Trash2, Plus, X, Trophy, Phone, MapPin } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SearchBar from '../components/ui/SearchBar';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import { Field, Input, Select } from '../components/ui/Field';
import { SkeletonTable } from '../components/ui/Skeleton';
import { fmt } from '../lib/format';
import * as customerService from '../services/customerService';
import * as saleService from '../services/saleService';
import { useToast } from '../context/ToastContext';
import PaymentModal from '../components/payments/PaymentModal';

const emptyForm = {
  shop_name: '', owner_name: '', phone: '', email: '',
  address: '', area: '', credit_limit: '', opening_balance: '',
};

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'dues', label: 'With dues' },
  { key: 'over', label: 'Over limit' },
];

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}

export default function CustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [viewId, setViewId] = useState(null);
  const [payId, setPayId] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [upiPayOpen, setUpiPayOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([customerService.fetchCustomers(), saleService.fetchSales()]);
      setCustomers(c);
      setSales(s);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const areas = useMemo(
    () => Array.from(new Set(customers.map((c) => c.area).filter(Boolean))).sort(),
    [customers]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter((c) => {
      const due = c.outstanding_balance || 0;
      if (filter === 'dues' && due <= 0) return false;
      if (filter === 'over' && !(due > (c.credit_limit || 0))) return false;
      if (areaFilter && c.area !== areaFilter) return false;
      if (!q) return true;
      return (
        c.shop_name.toLowerCase().includes(q) ||
        (c.owner_name || '').toLowerCase().includes(q) ||
        (c.area || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
      );
    });
  }, [customers, search, filter, areaFilter]);

  const ranking = useMemo(
    () =>
      [...customers]
        .filter((c) => (c.outstanding_balance || 0) > 0)
        .sort((a, b) => (b.outstanding_balance || 0) - (a.outstanding_balance || 0))
        .slice(0, 5),
    [customers]
  );
  const totalDues = useMemo(
    () => customers.reduce((n, c) => n + (c.outstanding_balance || 0), 0),
    [customers]
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.shop_name.trim()) {
      toast('Shop name is required', 'error');
      return;
    }
    try {
      const result = await customerService.createCustomer({
        shop_name: form.shop_name.trim(),
        owner_name: form.owner_name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        address: form.address.trim(),
        area: form.area.trim(),
        credit_limit: parseFloat(form.credit_limit) || 0,
        opening_balance: parseFloat(form.opening_balance) || 0,
      });
      if (result.success || result.id) {
        toast('Customer saved');
        setForm(emptyForm);
        setShowForm(false);
        load();
      } else {
        toast(result.message || 'Failed', 'error');
      }
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete customer "${name}"?`)) return;
    try {
      await customerService.deleteCustomer(id);
      toast('Customer deleted');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handlePayment = async () => {
    const amount = parseFloat(payAmount) || 0;
    if (!payId || amount <= 0) {
      toast('Enter valid amount', 'error');
      return;
    }
    try {
      const result = await customerService.recordPayment(payId, amount);
      if (result.success) {
        toast('Payment recorded');
        setPayId(null);
        setPayAmount('');
        load();
      } else {
        toast(result.message || 'Payment failed', 'error');
      }
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const viewCustomer = customers.find((c) => String(c.id) === String(viewId));
  const payCustomer = customers.find((c) => String(c.id) === String(payId));
  const viewSales = viewCustomer
    ? sales.filter((s) => String(s.customer_id) === String(viewCustomer.id)).slice(-5).reverse()
    : [];

  return (
    <div className="page-container">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Customers" subtitle="Manage shop accounts and outstanding dues" />
        <Button onClick={() => setShowForm((s) => !s)}>
          <Plus size={16} /> Add customer
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader title="Add Customer">
            <button type="button" onClick={() => setShowForm(false)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface2" aria-label="Close">
              <X size={16} />
            </button>
          </CardHeader>
          <CardBody>
            <div className="form-grid">
              <Field label="Shop"><Input value={form.shop_name} onChange={(e) => set('shop_name', e.target.value)} /></Field>
              <Field label="Owner Name"><Input value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} /></Field>
              <Field label="Phone"><Input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
              <Field label="Email"><Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Address"><Input value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
              <Field label="Area / Zone"><Input value={form.area} onChange={(e) => set('area', e.target.value)} /></Field>
              <Field label="Credit Limit (₹)"><Input type="number" value={form.credit_limit} onChange={(e) => set('credit_limit', e.target.value)} /></Field>
              <Field label="Opening Balance (₹)"><Input type="number" value={form.opening_balance} onChange={(e) => set('opening_balance', e.target.value)} /></Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleSave}>Save customer</Button>
              <Button variant="ghost" onClick={() => setForm(emptyForm)}>Clear</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title="Customer accounts">
            <SearchBar value={search} onChange={setSearch} placeholder="Search shop, owner, phone…" />
          </CardHeader>
          <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`min-h-[36px] rounded-full px-3.5 text-sm font-semibold transition-colors ${
                  filter === f.key ? 'bg-brand/10 text-brand' : 'bg-surface2 text-muted hover:text-text'
                }`}
              >
                {f.label}
              </button>
            ))}
            <Select
              value={areaFilter}
              onChange={(e) => setAreaFilter(e.target.value)}
              className="ml-auto w-auto min-h-[36px] py-1.5"
              aria-label="Filter by area"
            >
              <option value="">All areas</option>
              {areas.map((a) => <option key={a} value={a}>{a}</option>)}
            </Select>
          </div>
          <CardBody flush>
            {loading ? (
              <div className="p-4"><SkeletonTable rows={6} cols={5} /></div>
            ) : (
              <div className="tbl-scroll tbl-customers px-2 md:px-4">
                <table>
                  <thead>
                    <tr className="text-left text-[0.65rem] font-bold uppercase tracking-wide text-muted">
                      {['Shop', 'Zone', 'Phone', 'Credit', 'Outstanding', 'Status', ''].map((h) => (
                        <th key={h} className="bg-surface p-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {!filtered.length ? (
                      <tr><td colSpan={7} className="p-8 text-center italic text-muted">No customers found</td></tr>
                    ) : (
                      filtered.map((c) => {
                        const due = c.outstanding_balance || 0;
                        const status = due <= 0
                          ? <Badge tone="green" dot>Clear</Badge>
                          : due > (c.credit_limit || 0)
                            ? <Badge tone="red" dot>Over limit</Badge>
                            : <Badge tone="amber" dot>Dues</Badge>;
                        return (
                          <tr key={c.id} className="border-t border-border/60 transition-colors hover:bg-surface2">
                            <td className="p-3">
                              <div className="flex items-center gap-2.5">
                                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/12 text-xs font-bold text-brand">{initials(c.shop_name)}</span>
                                <div className="min-w-0">
                                  <div className="truncate font-semibold text-text">{c.shop_name}</div>
                                  <div className="truncate text-xs text-muted">{c.owner_name}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">{c.area ? <Badge tone="neutral">{c.area}</Badge> : <span className="text-muted">—</span>}</td>
                            <td className="p-3 text-sub">{c.phone || '—'}</td>
                            <td className="p-3 text-sub">{fmt(c.credit_limit)}</td>
                            <td className={`p-3 font-semibold ${due > 0 ? 'text-danger' : 'text-success'}`}>{fmt(due)}</td>
                            <td className="p-3">{status}</td>
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex gap-1.5">
                                <Button variant="ghost" size="sm" onClick={() => setViewId(c.id)} aria-label="View"><Eye size={15} /></Button>
                                <Button variant="green" size="sm" disabled={due <= 0} onClick={() => { setPayId(c.id); setPayAmount(''); }} aria-label="Record payment"><IndianRupee size={15} /></Button>
                                <Button variant="danger" size="sm" onClick={() => handleDelete(c.id, c.shop_name)} aria-label="Delete"><Trash2 size={15} /></Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Customer ranking panel */}
        <Card>
          <CardHeader title="Top Customers By Dues">
            <Trophy size={16} className="text-warning" />
          </CardHeader>
          <CardBody>
            <div className="mb-3 rounded-xl bg-surface2 p-3">
              <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted">Total outstanding</div>
              <div className="font-head text-2xl font-extrabold text-danger">{fmt(totalDues)}</div>
            </div>
            {loading ? (
              <SkeletonTable rows={5} cols={2} />
            ) : !ranking.length ? (
              <p className="text-sm text-muted">No outstanding dues</p>
            ) : (
              <ul className="space-y-3">
                {ranking.map((c, i) => {
                  const maxDue = ranking[0]?.outstanding_balance || 1;
                  const pct = Math.round(((c.outstanding_balance || 0) / maxDue) * 100);
                  return (
                    <li key={c.id} className="text-sm">
                      <div className="mb-1 flex items-center gap-2.5">
                        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-brand/12 text-[0.7rem] font-bold text-brand">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate font-medium">{c.shop_name}</span>
                        <span className="shrink-0 font-bold text-danger">{fmt(c.outstanding_balance)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
                        <div className="h-full rounded-full bg-gradient-to-r from-brand to-brand-light transition-[width] duration-700 ease-spring" style={{ width: `${pct}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>

      <Modal open={Boolean(viewCustomer)} onClose={() => setViewId(null)} title={viewCustomer?.shop_name} wide>
        {viewCustomer && (
          <>
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatCard label="Outstanding" value={fmt(viewCustomer.outstanding_balance)} icon={IndianRupee} accent={viewCustomer.outstanding_balance > 0 ? 'amber' : 'green'} />
              <StatCard label="Credit limit" value={fmt(viewCustomer.credit_limit)} accent="blue" />
            </div>
            <div className="mb-4 space-y-1.5 text-sm">
              <p className="text-muted">Owner: <span className="text-text">{viewCustomer.owner_name}</span></p>
              <p className="flex items-center gap-1.5 text-muted"><Phone size={14} /> <a href={`tel:${viewCustomer.phone}`} className="text-info">{viewCustomer.phone}</a></p>
              <p className="flex items-center gap-1.5 text-muted"><MapPin size={14} /> {viewCustomer.area}</p>
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">Recent sales</p>
            {viewSales.length ? (
              viewSales.map((s, i) => (
                <div key={i} className="flex flex-wrap justify-between gap-2 border-b border-border/60 py-2 text-sm">
                  <span>{s.date || '—'} · {s.product_name || '—'}</span>
                  <span className="font-semibold">{fmt(s.total_amount)}</span>
                </div>
              ))
            ) : (
              <p className="text-sm italic text-muted">No sales recorded</p>
            )}
          </>
        )}
      </Modal>

      <Modal open={Boolean(payCustomer)} onClose={() => setPayId(null)} title="Record Payment">
        {payCustomer && (
          <>
            <Field label="Customer"><Input readOnly className="opacity-70" value={`${payCustomer.shop_name} (${payCustomer.owner_name})`} /></Field>
            <Field label="Outstanding Due (₹)"><Input readOnly className="opacity-70" value={payCustomer.outstanding_balance} /></Field>
            <Field label="Payment Amount (₹)"><Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} placeholder="Enter amount" /></Field>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" variant="green" onClick={handlePayment}>Record cash/credit</Button>
              <Button className="flex-1" onClick={() => setUpiPayOpen(true)}>Pay via UPI</Button>
            </div>
          </>
        )}
      </Modal>

      <PaymentModal
        open={upiPayOpen && Boolean(payCustomer)}
        onClose={() => setUpiPayOpen(false)}
        customer={payCustomer}
        onSuccess={() => { setUpiPayOpen(false); setPayId(null); load(); }}
      />
    </div>
  );
}
