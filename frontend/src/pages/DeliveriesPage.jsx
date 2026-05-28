import { useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Field';
import { productLabel } from '../lib/products';
import * as deliveryService from '../services/deliveryService';
import * as productService from '../services/productService';
import * as customerService from '../services/customerService';
import { useToast } from '../context/ToastContext';
import { today } from '../lib/format';

const STATUSES = ['Pending', 'In Transit', 'Delivered', 'Failed'];

export default function DeliveriesPage() {
  const { toast } = useToast();
  const [list, setList] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');

  const [form, setForm] = useState({
    customer_id: '',
    product_id: '',
    qty: '',
    date: today(),
    driver: '',
    vehicle: '',
    status: 'Pending',
    notes: '',
  });

  const load = async () => {
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
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

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
        toast('Delivery added ✅');
        setForm({
          customer_id: '',
          product_id: '',
          qty: '',
          date: today(),
          driver: '',
          vehicle: '',
          status: 'Pending',
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
    if (!confirm('Delete this delivery?')) return;
    try {
      await deliveryService.deleteDelivery(id);
      toast('Deleted ✅');
      load();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="page-container">
      <PageHeader title="Delivery Tracking" subtitle="Monitor shop deliveries and collections" />

      <Card>
        <CardHeader title="Log Delivery" />
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
              <Select value={form.product_id} onChange={(e) => set('product_id', e.target.value)}>
                <option value="">— Select Product —</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {productLabel(p)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Cases Delivered">
              <Input type="number" min="1" value={form.qty} onChange={(e) => set('qty', e.target.value)} />
            </Field>
            <Field label="Delivery Date">
              <Input type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
            </Field>
            <Field label="Driver Name">
              <Input value={form.driver} onChange={(e) => set('driver', e.target.value)} />
            </Field>
            <Field label="Vehicle No.">
              <Input value={form.vehicle} onChange={(e) => set('vehicle', e.target.value)} placeholder="MH-XX-XXXX" />
            </Field>
            <Field label="Status">
              <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
            <Field label="Notes">
              <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={handleSave}>🚚 Log Delivery</Button>
            <Button
              variant="ghost"
              onClick={() =>
                setForm({
                  customer_id: '',
                  product_id: '',
                  qty: '',
                  date: today(),
                  driver: '',
                  vehicle: '',
                  status: 'Pending',
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
        <CardHeader title="Delivery Log">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full sm:w-auto"
          >
            <option value="">All Status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </CardHeader>
        <CardBody flush>
          <div className="tbl-scroll tbl-deliveries px-2 md:px-4">
            <table>
              <thead>
                <tr className="text-left text-[0.65rem] font-bold uppercase text-muted">
                  {['Date', 'Customer', 'Product', 'Qty', 'Driver', 'Vehicle', 'Status', ''].map((h) => (
                    <th key={h} className="bg-card p-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!list.length ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center italic text-muted">
                      No deliveries yet
                    </td>
                  </tr>
                ) : (
                  list.map((d) => (
                    <tr key={d.id} className="border-t border-border/30">
                      <td className="p-3">{d.delivery_date || '—'}</td>
                      <td className="p-3">{d.customer_name || '—'}</td>
                      <td className="p-3">{d.product_name || '—'}</td>
                      <td className="p-3">{d.quantity || 0}</td>
                      <td className="p-3">{d.driver_name || '—'}</td>
                      <td className="p-3">{d.vehicle_no || '—'}</td>
                      <td
                        className={`p-3 ${
                          d.status === 'Pending' ? 'text-red-400' : 'text-green-400'
                        }`}
                      >
                        {d.status}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Button variant="danger" size="sm" onClick={() => handleDelete(d.id)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
