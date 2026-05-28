import { useEffect, useMemo, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SearchBar from '../components/ui/SearchBar';
import Modal from '../components/ui/Modal';
import StatCard from '../components/ui/StatCard';
import { Field, Input } from '../components/ui/Field';
import { fmt } from '../lib/format';
import * as customerService from '../services/customerService';
import * as saleService from '../services/saleService';
import { useToast } from '../context/ToastContext';

const emptyForm = {
  shop_name: '',
  owner_name: '',
  phone: '',
  email: '',
  address: '',
  area: '',
  credit_limit: '',
  opening_balance: '',
};

export default function CustomersPage() {
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [sales, setSales] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [viewId, setViewId] = useState(null);
  const [payId, setPayId] = useState(null);
  const [payAmount, setPayAmount] = useState('');

  const load = async () => {
    try {
      const [c, s] = await Promise.all([customerService.fetchCustomers(), saleService.fetchSales()]);
      setCustomers(c);
      setSales(s);
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.shop_name.toLowerCase().includes(q) ||
        c.owner_name.toLowerCase().includes(q) ||
        (c.area || '').toLowerCase().includes(q)
    );
  }, [customers, search]);

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
        toast('Customer saved ✅');
        setForm(emptyForm);
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
        toast('Payment recorded ✅');
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
      <PageHeader title="Customers" subtitle="Manage shop accounts and outstanding dues" />

      <Card>
        <CardHeader title="Add Customer" />
        <CardBody>
          <div className="form-grid">
            <Field label="Shop">
              <Input value={form.shop_name} onChange={(e) => set('shop_name', e.target.value)} />
            </Field>
            <Field label="Owner Name">
              <Input value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} />
            </Field>
            <Field label="Phone">
              <Input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Address">
              <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
            <Field label="Area / Zone">
              <Input value={form.area} onChange={(e) => set('area', e.target.value)} />
            </Field>
            <Field label="Credit Limit (₹)">
              <Input type="number" value={form.credit_limit} onChange={(e) => set('credit_limit', e.target.value)} />
            </Field>
            <Field label="Opening Balance (₹)">
              <Input
                type="number"
                value={form.opening_balance}
                onChange={(e) => set('opening_balance', e.target.value)}
              />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={handleSave}>🏪 Save Customer</Button>
            <Button variant="ghost" onClick={() => setForm(emptyForm)}>
              ✕ Clear
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Customer Accounts">
          <SearchBar value={search} onChange={setSearch} placeholder="Search customers…" />
        </CardHeader>
        <CardBody flush>
          <div className="tbl-scroll tbl-customers px-2 md:px-4">
            <table>
              <thead>
                <tr className="text-left text-[0.65rem] font-bold uppercase text-muted">
                  {['Shop', 'Owner', 'Phone', 'Zone', 'Credit', 'Due', 'Status', ''].map((h) => (
                    <th key={h} className="bg-card p-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!filtered.length ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center italic text-muted">
                      No customers yet
                    </td>
                  </tr>
                ) : (
                  filtered.map((c) => {
                    const due = c.outstanding_balance || 0;
                    const status =
                      due <= 0 ? (
                        <Badge tone="green">Clear</Badge>
                      ) : due > (c.credit_limit || 0) ? (
                        <Badge tone="red">Over Limit</Badge>
                      ) : (
                        <Badge tone="amber">Dues Pending</Badge>
                      );
                    return (
                      <tr key={c.id} className="border-t border-border/30">
                        <td className="p-3 font-semibold">{c.shop_name}</td>
                        <td className="p-3">{c.owner_name}</td>
                        <td className="p-3">{c.phone}</td>
                        <td className="p-3">
                          <Badge>{c.area}</Badge>
                        </td>
                        <td className="p-3">{fmt(c.credit_limit)}</td>
                        <td className={`p-3 ${due > 0 ? 'font-bold text-red-400' : ''}`}>{fmt(due)}</td>
                        <td className="p-3">{status}</td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex flex-wrap gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setViewId(c.id)}>
                              👁
                            </Button>
                            <Button
                              variant="green"
                              size="sm"
                              disabled={due <= 0}
                              onClick={() => {
                                setPayId(c.id);
                                setPayAmount('');
                              }}
                            >
                              ₹ Pay
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleDelete(c.id, c.shop_name)}
                            >
                              🗑
                            </Button>
                          </div>
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

      <Modal open={Boolean(viewCustomer)} onClose={() => setViewId(null)} title={viewCustomer?.shop_name} wide>
        {viewCustomer && (
          <>
            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <StatCard
                label="Outstanding"
                value={fmt(viewCustomer.outstanding_balance)}
                accent={viewCustomer.outstanding_balance > 0 ? 'brand' : 'green'}
              />
            </div>
            <div className="mb-4 space-y-1 text-sm">
              <p>
                <span className="text-muted">Owner:</span> {viewCustomer.owner_name}
              </p>
              <p>
                <span className="text-muted">Phone:</span>{' '}
                <a href={`tel:${viewCustomer.phone}`} className="text-blue-400">
                  {viewCustomer.phone}
                </a>
              </p>
              <p>
                <span className="text-muted">Zone:</span> {viewCustomer.area}
              </p>
            </div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Recent Sales</p>
            {viewSales.length ? (
              viewSales.map((s, i) => (
                <div
                  key={i}
                  className="flex flex-wrap justify-between gap-2 border-b border-border/40 py-2 text-sm"
                >
                  <span>
                    {s.date || '—'} · {s.product_name || '—'}
                  </span>
                  <span>{fmt(s.total_amount)}</span>
                </div>
              ))
            ) : (
              <p className="italic text-muted text-sm">No sales recorded</p>
            )}
          </>
        )}
      </Modal>

      <Modal
        open={Boolean(payCustomer)}
        onClose={() => setPayId(null)}
        title="Record Payment"
      >
        {payCustomer && (
          <>
            <Field label="Customer">
              <Input
                readOnly
                className="opacity-70"
                value={`${payCustomer.shop_name} (${payCustomer.owner_name})`}
              />
            </Field>
            <Field label="Outstanding Due (₹)">
              <Input readOnly className="opacity-70" value={payCustomer.outstanding_balance} />
            </Field>
            <Field label="Payment Amount (₹)">
              <Input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </Field>
            <Button className="mt-4 w-full" variant="green" onClick={handlePayment}>
              ✓ Record Payment
            </Button>
          </>
        )}
      </Modal>
    </div>
  );
}
