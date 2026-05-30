import { useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  Package, IndianRupee, AlertTriangle, Plus, X, Pencil, Trash2,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { productImage } from '../lib/productImages';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import StatCard from '../components/ui/StatCard';
import SearchBar from '../components/ui/SearchBar';
import { Field, Input, Select } from '../components/ui/Field';
import { SkeletonTable } from '../components/ui/Skeleton';
import { fmt, fmtNum } from '../lib/format';
import { mapProductToApi } from '../lib/products';
import * as productService from '../services/productService';
import { useToast } from '../context/ToastContext';
import { queryKeys } from '../lib/queryClient';

const emptyForm = { name: '', sku: '', cat: 'Cola', size: '', stock: '', bpc: '24', price: '', reorder: '10' };
const CATEGORIES = ['Cola', 'Lemon', 'Orange', 'Soda', 'Other'];

export default function InventoryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data: products = [], isFetching: loading } = useQuery({
    queryKey: queryKeys.inventory(`${page}:${search}`),
    queryFn: () => productService.fetchProducts(page, search),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
  const { data: stats } = useQuery({
    queryKey: ['inventory', 'stats'],
    queryFn: productService.fetchProductStats,
    staleTime: 30_000,
  });
  const hasNext = products.length >= 5;

  const reload = () => qc.invalidateQueries({ queryKey: ['inventory'] });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('Product name required', 'error');
      return;
    }
    try {
      const payload = mapProductToApi(form);
      if (editId) {
        await productService.updateProduct(editId, payload);
        toast('Product updated');
      } else {
        await productService.createProduct(payload);
        toast('Product saved');
      }
      setForm(emptyForm);
      setEditId(null);
      setShowForm(false);
      setPage(1);
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const startEdit = (p) => {
    setEditId(p.id);
    setShowForm(true);
    setForm({
      name: p.name,
      sku: p.sku === '-' ? '' : p.sku,
      cat: p.cat === '-' ? 'Cola' : p.cat,
      size: p.size === '-' ? '' : p.size,
      stock: String(p.stock),
      bpc: String(p.bpc),
      price: String(p.price),
      reorder: String(p.reorder),
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await productService.deleteProduct(id);
      toast('Product deleted');
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  return (
    <div className="page-container">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Inventory" subtitle="Manage your product stock levels" />
        <Button onClick={() => { setEditId(null); setForm(emptyForm); setShowForm((s) => !s); }}>
          <Plus size={16} /> Add product
        </Button>
      </div>

      {/* Inventory value KPIs */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total SKUs" value={fmtNum(stats?.totalProducts ?? '—')} icon={Package} accent="blue" sub="across all categories" />
        <StatCard label="Stock value" value={fmt(stats?.totalValue ?? 0)} icon={IndianRupee} accent="brand" sub="total inventory value" />
        <StatCard label="Low stock" value={fmtNum(stats?.lowStock ?? 0)} icon={AlertTriangle} accent="amber" sub="products running low" />
      </div>

      {showForm && (
        <Card>
          <CardHeader title={editId ? 'Update product' : 'Add product'}>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setForm(emptyForm); }} className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-surface2" aria-label="Close">
              <X size={16} />
            </button>
          </CardHeader>
          <CardBody>
            <div className="form-grid">
              <Field label="Product Name"><Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Thumbs Up 300ml" /></Field>
              <Field label="SKU / Code"><Input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="TU-300" /></Field>
              <Field label="Category">
                <Select value={form.cat} onChange={(e) => set('cat', e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Unit Size"><Input value={form.size} onChange={(e) => set('size', e.target.value)} placeholder="300ml" /></Field>
              <Field label="Cases in Stock"><Input type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} /></Field>
              <Field label="Bottles per Case"><Input type="number" min="1" value={form.bpc} onChange={(e) => set('bpc', e.target.value)} /></Field>
              <Field label="Price per Case (₹)"><Input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} /></Field>
              <Field label="Reorder Level"><Input type="number" min="0" value={form.reorder} onChange={(e) => set('reorder', e.target.value)} /></Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={handleSave}>{editId ? 'Update product' : 'Save product'}</Button>
              <Button variant="ghost" onClick={() => { setForm(emptyForm); setEditId(null); }}>Clear</Button>
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardHeader title="Product catalog">
          <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search products, SKU…" />
        </CardHeader>
        <CardBody flush>
          {loading && !products.length ? (
            <div className="p-4"><SkeletonTable rows={6} cols={5} /></div>
          ) : (
            <div className="tbl-scroll tbl-inventory px-2 md:px-4">
              <table>
                <thead>
                  <tr className="text-left text-[0.65rem] font-bold uppercase tracking-wide text-muted">
                    {['Product', 'SKU', 'Category', 'Stock', 'Price', 'Status', ''].map((h) => (
                      <th key={h} className="bg-surface p-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!products.length ? (
                    <tr><td colSpan={7} className="p-8 text-center italic text-muted">No products found</td></tr>
                  ) : (
                    products.map((p) => {
                      const pct = p.reorder > 0 ? (p.stock / p.reorder) * 100 : 100;
                      const status = p.stock <= 0
                        ? <Badge tone="red" dot>Out of stock</Badge>
                        : p.stock <= p.reorder
                          ? <Badge tone="amber" dot>Low</Badge>
                          : <Badge tone="green" dot>In stock</Badge>;
                      return (
                        <tr key={p.id} className="border-t border-border/60 transition-colors hover:bg-surface2">
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl border border-border bg-white">
                                <img src={productImage(p.name)} alt={p.name} loading="lazy" className="h-full w-full object-contain p-1" />
                              </span>
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-text">{p.name}</div>
                                <div className="truncate text-xs text-muted">{p.size}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-sub">{p.sku}</td>
                          <td className="p-3"><Badge tone="neutral">{p.cat}</Badge></td>
                          <td className="p-3 min-w-[120px]">
                            <strong className="text-text">{fmtNum(p.stock)}</strong>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface2">
                              <div
                                className={`h-full rounded-full transition-[width] duration-700 ease-spring ${p.stock <= 0 ? 'bg-danger' : p.stock <= p.reorder ? 'bg-warning' : 'bg-success'}`}
                                style={{ width: `${Math.min(100, Math.max(4, pct))}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-sub">{fmt(p.price)}</td>
                          <td className="p-3">{status}</td>
                          <td className="p-3 whitespace-nowrap">
                            <div className="flex gap-1.5">
                              <Button variant="ghost" size="sm" onClick={() => startEdit(p)} aria-label="Edit"><Pencil size={15} /></Button>
                              <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)} aria-label="Delete"><Trash2 size={15} /></Button>
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
          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
            <span className="text-xs text-muted">Page {page}</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={15} /> Prev</Button>
              <Button variant="ghost" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight size={15} /></Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
