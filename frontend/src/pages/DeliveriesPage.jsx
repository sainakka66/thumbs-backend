import { useEffect, useMemo, useState } from 'react';
import {
  Truck, Plus, X, Trash2, User, Car, Calendar, ChevronRight, Check,
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Field, Input, Select } from '../components/ui/Field';
import { SkeletonCard } from '../components/ui/Skeleton';
import { productLabel } from '../lib/products';
import * as deliveryService from '../services/deliveryService';
import * as productService from '../services/productService';
import * as customerService from '../services/customerService';
import { useToast } from '../context/ToastContext';
import { today } from '../lib/format';

// Approved 4-stage status pipeline.
const STAGES = ['Pending', 'Scheduled', 'In Transit', 'Completed'];

function stageIndex(status) {
  const s = String(status || '').toLowerCase();
  if (/(complet|deliver|done)/.test(s)) return 3;
  if (/transit/.test(s)) return 2;
  if (/schedul/.test(s)) return 1;
  return 0;
}

// Badge tone keys (valid Badge tones) + static bar classes (so Tailwind keeps them).
const stageTone = ['amber', 'blue', 'blue', 'green'];
const stageBar = ['bg-warning', 'bg-info', 'bg-info', 'bg-success'];

const blankForm = {
  customer_id: '', product_id: '', qty: '', date: today(),
  driver: '', vehicle: '', status: 'Pending', notes: '',
};

export default function DeliveriesPage() {
  const { toast } = useToast();
  const [list, setList] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(blankForm);

  const load = async () => {
    setLoading(true);
    try {
      const [d, p, c] = await Promise.all([
        deliveryService.fetchDeliveries(statusFilter),
        productService.fetchProducts(1, ''),
        customerService.fetchCustomers(),
      ]);
      setList(d);
      setProducts(p);
      setCustomers(c);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const counts = useMemo(() => {
    const c = { Pending: 0, Scheduled: 0, 'In Transit': 0, Completed: 0 };
    list.forEach((d) => { c[STAGES[stageIndex(d.status)]] += 1; });
    return c;
  }, [list]);

  const handleSave = async () => {
    const prod = products.find((p) => String(p.id) === String(form.product_id));
    if (!form.customer_id) {
      toast('Select customer', 'error');
      return;
    }
    try {
      const result = await deliveryService.createDelivery({
        customer_id: form.customer_id,
        product_name: prod ? productLabel(prod) : form.product_id,
        quantity: parseInt(form.qty, 10) || 0,
        delivery_date: form.date,
        driver_name: form.driver,
        vehicle_no: form.vehicle,
        status: form.status,
        notes: form.notes,
      });
      if (result.success) {
        toast('Delivery scheduled');
        setForm(blankForm);
        setShowForm(false);
        load();
      } else {
        toast(result.message || 'Failed', 'error');
      }
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const advance = async (d) => {
    const next = STAGES[Math.min(3, stageIndex(d.status) + 1)];
    try {
      await deliveryService.updateDelivery(d.id, { status: next });
      toast(`Marked ${next}`);
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this delivery?')) return;
    try {
      await deliveryService.deleteDelivery(id);
      toast('Deleted');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="page-container">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Deliveries" subtitle="Track shop deliveries through their pipeline" />
        <Button onClick={() => setShowForm((s) => !s)}><Plus size={16} /> Schedule delivery</Button>
      </div>

      {/* Status tracker summary */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STAGES.map((s, i) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
            className={`surface-card p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-elev ${statusFilter === s ? 'ring-2 ring-brand' : ''}`}
          >
            <div className="text-[0.7rem] font-semibold uppercase tracking-wide text-muted">{s}</div>
            <div className="mt-1 font-head text-2xl font-extrabold text-text">{counts[s]}</div>
            <span className={`mt-1 inline-block h-1 w-8 rounded-full ${stageBar[i]}`} />
          </button>
        ))}
      </div>

      {showForm && (
        <Card>
          <CardHeader title="Schedule delivery">
            <button type="button" onClick={() => setShowForm(false)} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface2" aria-label="Close"><X size={16} /></button>
          </CardHeader>
          <CardBody>
            <div className="form-grid">
              <Field label="Customer / Shop">
                <Select value={form.customer_id} onChange={(e) => set('customer_id', e.target.value)}>
                  <option value="">— Select customer —</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.shop_name}</option>)}
                </Select>
              </Field>
              <Field label="Product">
                <Select value={form.product_id} onChange={(e) => set('product_id', e.target.value)}>
                  <option value="">— Select product —</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{productLabel(p)}</option>)}
                </Select>
              </Field>
              <Field label="Cases"><Input type="number" min="1" value={form.qty} onChange={(e) => set('qty', e.target.value)} /></Field>
              <Field label="Delivery date"><Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
              <Field label="Driver name"><Input value={form.driver} onChange={(e) => set('driver', e.target.value)} /></Field>
              <Field label="Vehicle no."><Input value={form.vehicle} onChange={(e) => set('vehicle', e.target.value)} placeholder="MH-XX-XXXX" /></Field>
              <Field label="Status">
                <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
                  {STAGES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="Notes"><Input value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleSave}>Schedule delivery</Button>
              <Button variant="ghost" onClick={() => setForm(blankForm)}>Clear</Button>
            </div>
          </CardBody>
        </Card>
      )}

      {loading ? (
        <div className="space-y-3"><SkeletonCard /><SkeletonCard /></div>
      ) : !list.length ? (
        <Card><CardBody><p className="py-6 text-center italic text-muted">No deliveries found</p></CardBody></Card>
      ) : (
        <div className="space-y-3">
          {list.map((d) => {
            const idx = stageIndex(d.status);
            const pct = (idx / (STAGES.length - 1)) * 100;
            const done = idx >= 3;
            return (
              <div key={d.id} className="surface-card p-4 transition-all hover:shadow-elev">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><Truck size={18} /></span>
                    <div className="min-w-0">
                      <div className="font-semibold text-text">{d.customer_name || 'Customer'}</div>
                      <div className="text-xs text-muted">{d.product_name || '—'} · {d.quantity || 0} cases</div>
                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                        <span className="inline-flex items-center gap-1"><User size={12} /> {d.driver_name || '—'}</span>
                        <span className="inline-flex items-center gap-1"><Car size={12} /> {d.vehicle_no || '—'}</span>
                        <span className="inline-flex items-center gap-1"><Calendar size={12} /> {d.delivery_date || '—'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={stageTone[idx]} dot>{STAGES[idx]}</Badge>
                    {!done && (
                      <Button size="sm" variant="ghost" onClick={() => advance(d)}>
                        {STAGES[idx + 1]} <ChevronRight size={14} />
                      </Button>
                    )}
                    <button type="button" onClick={() => handleDelete(d.id)} className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger" aria-label="Delete"><Trash2 size={15} /></button>
                  </div>
                </div>

                {/* Animated timeline */}
                <div className="mt-4">
                  <div className="relative">
                    <div className="absolute left-0 right-0 top-[11px] h-1 rounded-full bg-surface2" />
                    <div
                      className="absolute left-0 top-[11px] h-1 rounded-full bg-brand transition-[width] duration-700 ease-spring"
                      style={{ width: `${pct}%` }}
                    />
                    <div className="relative flex justify-between">
                      {STAGES.map((s, i) => (
                        <div key={s} className="flex flex-col items-center gap-1">
                          <span className={`grid h-6 w-6 place-items-center rounded-full border-2 text-[0.6rem] font-bold transition-colors ${
                            i <= idx ? 'border-brand bg-brand text-white' : 'border-border bg-surface text-muted'
                          }`}>
                            {i < idx || done ? <Check size={12} /> : i + 1}
                          </span>
                          <span className={`text-[0.6rem] ${i <= idx ? 'font-semibold text-text' : 'text-muted'}`}>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
