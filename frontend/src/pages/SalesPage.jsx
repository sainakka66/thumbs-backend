import { useEffect, useState } from 'react';
import { Banknote, Smartphone, Clock, Minus, Plus, Trash2, Receipt } from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Field, Input } from '../components/ui/Field';
import PickerSelect from '../components/ui/PickerSelect';
import { SkeletonCard } from '../components/ui/Skeleton';
import { fmt, today } from '../lib/format';
import { productLabel } from '../lib/products';
import { productImage } from '../lib/productImages';

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
}
import * as saleService from '../services/saleService';
import * as productService from '../services/productService';
import * as customerService from '../services/customerService';
import { useToast } from '../context/ToastContext';

const PAYMENT_MODES = [
  { key: 'Cash', label: 'Cash', icon: Banknote },
  { key: 'UPI', label: 'UPI', icon: Smartphone },
  { key: 'Credit', label: 'Credit', icon: Clock },
];

const blankForm = {
  customer_id: '', product_id: '', qty: '', price: '', total: '',
  paid: '', due: '', mode: 'Cash', date: today(), notes: '',
};

export default function SalesPage() {
  const { toast } = useToast();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(blankForm);

  const load = async () => {
    setLoading(true);
    try {
      const [s, p, c] = await Promise.all([
        saleService.fetchSales(),
        productService.fetchProducts(1, ''),
        customerService.fetchCustomers(),
      ]);
      setSales(s);
      setProducts(p);
      setCustomers(c);
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const recalc = (next) => {
    const qty = parseFloat(next.qty) || 0;
    const price = parseFloat(next.price) || 0;
    const total = qty * price;
    const paid = parseFloat(next.paid) || 0;
    return { ...next, total: String(total), due: String(Math.max(0, total - paid)) };
  };

  const onProductChange = (productId) => {
    const prod = products.find((p) => String(p.id) === String(productId));
    setForm((f) => recalc({ ...f, product_id: productId, price: prod ? String(prod.price) : f.price }));
  };

  const stepQty = (delta) => setForm((f) => recalc({ ...f, qty: String(Math.max(0, (parseInt(f.qty, 10) || 0) + delta)) }));

  const handleRecord = async () => {
    const prod = products.find((p) => String(p.id) === String(form.product_id));
    if (!form.customer_id || !prod) {
      toast('Select customer and product', 'error');
      return;
    }
    try {
      const result = await saleService.createSale({
        customer_id: form.customer_id,
        product_name: productLabel(prod),
        quantity: parseInt(form.qty, 10) || 0,
        price_per_case: parseFloat(form.price) || 0,
        total_amount: parseFloat(form.total) || 0,
        amount_paid: parseFloat(form.paid) || 0,
        payment_mode: form.mode,
        notes: form.notes,
      });
      if (result.success) {
        toast('Sale recorded');
        setForm(blankForm);
        load();
      } else {
        toast(result.message || 'Failed', 'error');
      }
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this sale?')) return;
    try {
      await saleService.deleteSale(id);
      toast('Sale deleted');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const recent = sales.slice(0, 10);
  const selectedProduct = products.find((p) => String(p.id) === String(form.product_id));
  const customerOptions = customers.map((c) => ({
    value: c.id, label: c.shop_name, sub: c.owner_name || c.area, initials: initials(c.shop_name),
  }));
  const productOptions = products.map((p) => ({
    value: p.id, label: productLabel(p), sub: fmt(p.price), image: productImage(p.name),
  }));

  return (
    <div className="page-container">
      <PageHeader title="New sale" subtitle="Record a sales transaction" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* Entry form */}
        <Card>
          <CardBody>
            <div className="space-y-4">
              <Field label="Customer / Shop">
                <PickerSelect
                  value={form.customer_id}
                  onChange={(v) => set('customer_id', v)}
                  options={customerOptions}
                  placeholder="— Select customer —"
                />
              </Field>
              <Field label="Product">
                <PickerSelect
                  value={form.product_id}
                  onChange={onProductChange}
                  options={productOptions}
                  placeholder="— Select product —"
                />
              </Field>

              {/* Selected product image preview */}
              {selectedProduct && (
                <div className="flex items-center gap-3 rounded-xl border border-border bg-surface2 p-3">
                  <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-white">
                    <img src={productImage(selectedProduct.name)} alt={selectedProduct.name} className="h-full w-full object-contain p-1" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-text">{productLabel(selectedProduct)}</div>
                    <div className="text-sm text-muted">{fmt(selectedProduct.price)} / case</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Quantity (cases)">
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => stepQty(-1)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-text hover:bg-surface2" aria-label="Decrease quantity"><Minus size={16} /></button>
                    <Input type="number" min="0" value={form.qty} onChange={(e) => setForm((f) => recalc({ ...f, qty: e.target.value }))} className="text-center" />
                    <button type="button" onClick={() => stepQty(1)} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-text hover:bg-surface2" aria-label="Increase quantity"><Plus size={16} /></button>
                  </div>
                </Field>
                <Field label="Price per case (₹)">
                  <Input type="number" value={form.price} onChange={(e) => setForm((f) => recalc({ ...f, price: e.target.value }))} />
                </Field>
              </div>

              {/* Auto total */}
              <div className="rounded-xl border border-brand/20 bg-brand/5 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-sub">Total</span>
                  <span className="font-head text-2xl font-extrabold text-brand">{fmt(form.total || 0)}</span>
                </div>
              </div>

              <Field label="Amount paid (₹)">
                <Input type="number" value={form.paid} onChange={(e) => setForm((f) => recalc({ ...f, paid: e.target.value }))} />
              </Field>
              {Number(form.due) > 0 && (
                <p className="text-sm text-warning">Balance due: <span className="font-bold">{fmt(form.due)}</span></p>
              )}

              {/* Payment mode tabs */}
              <div>
                <div className="mb-1.5 text-[0.72rem] font-bold uppercase tracking-wide text-muted">Payment mode</div>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_MODES.map((m) => {
                    const Icon = m.icon;
                    const active = form.mode === m.key;
                    return (
                      <button
                        key={m.key}
                        type="button"
                        onClick={() => set('mode', m.key)}
                        className={`flex min-h-[44px] items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-colors ${
                          active ? 'border-brand bg-brand text-white' : 'border-border bg-surface text-sub hover:bg-surface2'
                        }`}
                      >
                        <Icon size={16} /> {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Sale date"><Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} /></Field>
                <Field label="Notes"><Input value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional" /></Field>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleRecord} className="flex-1"><Receipt size={16} /> Record sale</Button>
                <Button variant="ghost" onClick={() => setForm(blankForm)}>Clear</Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Recent sales panel */}
        <Card>
          <CardHeader title="Recent sales" />
          <CardBody flush>
            {loading ? (
              <div className="p-4"><SkeletonCard /></div>
            ) : !recent.length ? (
              <p className="px-4 py-6 text-sm text-muted">No sales recorded</p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((s) => {
                  const due = (s.total_amount || 0) - (s.amount_paid || 0);
                  return (
                    <li key={s.id} className="group flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-text">{s.customer_name || 'Walk-in'}</div>
                        <div className="truncate text-xs text-muted">{s.date || '—'} · {s.product_name || '—'}</div>
                      </div>
                      <div className="flex items-center gap-2 text-right">
                        <div>
                          <div className="text-sm font-bold text-text">{fmt(s.total_amount)}</div>
                          <Badge tone={due > 0 ? 'amber' : 'green'}>{due > 0 ? 'Credit' : 'Paid'}</Badge>
                        </div>
                        <button type="button" onClick={() => handleDelete(s.id)} className="grid h-8 w-8 place-items-center rounded-lg text-muted opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100" aria-label="Delete sale">
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
