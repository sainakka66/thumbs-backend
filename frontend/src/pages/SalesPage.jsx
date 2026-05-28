import { useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Field';
import { fmt } from '../lib/format';
import { productLabel } from '../lib/products';
import * as saleService from '../services/saleService';
import * as productService from '../services/productService';
import * as customerService from '../services/customerService';
import { useToast } from '../context/ToastContext';
import { today } from '../lib/format';

export default function SalesPage() {
  const { toast } = useToast();
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filterDate, setFilterDate] = useState('');

  const [form, setForm] = useState({
    customer_id: '',
    product_id: '',
    qty: '',
    price: '',
    total: '',
    paid: '',
    due: '',
    mode: 'Cash',
    date: today(),
    notes: '',
  });

  const load = async () => {
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
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const onProductChange = (productId) => {
    set('product_id', productId);
    const prod = products.find((p) => String(p.id) === String(productId));
    if (prod) {
      const qty = parseFloat(form.qty) || 0;
      set('price', String(prod.price));
      set('total', String(qty * prod.price));
      const paid = parseFloat(form.paid) || 0;
      set('due', String(Math.max(0, qty * prod.price - paid)));
    }
  };

  const recalc = (next) => {
    const qty = parseFloat(next.qty) || 0;
    const price = parseFloat(next.price) || 0;
    const total = qty * price;
    const paid = parseFloat(next.paid) || 0;
    return { ...next, total: String(total), due: String(Math.max(0, total - paid)) };
  };

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
        toast('Sale recorded ✅');
        setForm({
          customer_id: '',
          product_id: '',
          qty: '',
          price: '',
          total: '',
          paid: '',
          due: '',
          mode: 'Cash',
          date: today(),
          notes: '',
        });
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

  const filtered = filterDate ? sales.filter((s) => s.date === filterDate) : sales;

  return (
    <div className="page-container">
      <PageHeader title="Sales Entry" subtitle="Record daily sales transactions" />

      <Card>
        <CardHeader title="New Sale" />
        <CardBody>
          <div className="form-grid">
            <Field label="Customer / Shop">
              <Select value={form.customer_id} onChange={(e) => set('customer_id', e.target.value)}>
                <option value="">— Select Customer —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.shop_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Product">
              <Select
                value={form.product_id}
                onChange={(e) => onProductChange(e.target.value)}
              >
                <option value="">— Select Product —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {productLabel(p)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Quantity (Cases)">
              <Input
                type="number"
                min="1"
                value={form.qty}
                onChange={(e) => setForm((f) => recalc({ ...f, qty: e.target.value }))}
              />
            </Field>
            <Field label="Price per Case (₹)">
              <Input
                type="number"
                value={form.price}
                onChange={(e) => setForm((f) => recalc({ ...f, price: e.target.value }))}
              />
            </Field>
            <Field label="Total Amount (₹)">
              <Input type="number" readOnly className="opacity-70" value={form.total} />
            </Field>
            <Field label="Payment Mode">
              <Select value={form.mode} onChange={(e) => set('mode', e.target.value)}>
                {['Cash', 'UPI', 'Credit', 'Cheque'].map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
            </Field>
            <Field label="Amount Paid (₹)">
              <Input
                type="number"
                value={form.paid}
                onChange={(e) => setForm((f) => recalc({ ...f, paid: e.target.value }))}
              />
            </Field>
            <Field label="Balance Due (₹)">
              <Input type="number" readOnly className="opacity-70" value={form.due} />
            </Field>
            <Field label="Sale Date">
              <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </Field>
            <Field label="Notes">
              <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={handleRecord}>💰 Record Sale</Button>
            <Button
              variant="ghost"
              onClick={() =>
                setForm({
                  customer_id: '',
                  product_id: '',
                  qty: '',
                  price: '',
                  total: '',
                  paid: '',
                  due: '',
                  mode: 'Cash',
                  date: today(),
                  notes: '',
                })
              }
            >
              ✕ Clear
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Sales History">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-auto"
            />
            <Button variant="ghost" size="sm" onClick={() => setFilterDate('')}>
              All
            </Button>
          </div>
        </CardHeader>
        <CardBody flush>
          <div className="tbl-scroll tbl-sales px-2 md:px-4">
            <table>
              <thead>
                <tr className="text-left text-[0.65rem] font-bold uppercase text-muted">
                  {['Date', 'Customer', 'Product', 'Qty', 'Total', 'Paid', 'Due', 'Mode', ''].map((h) => (
                    <th key={h} className="bg-card p-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center italic text-muted">
                      No sales recorded
                    </td>
                  </tr>
                ) : (
                  filtered.map((s) => {
                    const due = (s.total_amount || 0) - (s.amount_paid || 0);
                    return (
                      <tr key={s.id} className="border-t border-border/30">
                        <td className="p-3">{s.date || '—'}</td>
                        <td className="p-3">{s.customer_name || '—'}</td>
                        <td className="p-3">{s.product_name || '—'}</td>
                        <td className="p-3">{s.quantity || 0}</td>
                        <td className="p-3">{s.total_amount || 0}</td>
                        <td className="p-3 text-green-400">{s.amount_paid || 0}</td>
                        <td className={`p-3 ${due > 0 ? 'font-bold text-red-400' : ''}`}>{due}</td>
                        <td className="p-3">{s.payment_mode || '—'}</td>
                        <td className="p-3">
                          <Button variant="danger" size="sm" onClick={() => handleDelete(s.id)}>
                            🗑
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
