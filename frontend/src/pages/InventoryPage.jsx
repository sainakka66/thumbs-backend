import { useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardBody, CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import SearchBar from '../components/ui/SearchBar';
import { Field, Input, Select } from '../components/ui/Field';
import { fmt, fmtNum } from '../lib/format';
import { mapProductToApi } from '../lib/products';
import * as productService from '../services/productService';
import { useToast } from '../context/ToastContext';
import { queryKeys } from '../lib/queryClient';

const emptyForm = {
  name: '',
  sku: '',
  cat: 'Cola',
  size: '',
  stock: '',
  bpc: '24',
  price: '',
  reorder: '10',
};

const CATEGORIES = ['Cola', 'Lemon', 'Orange', 'Soda', 'Other'];

export default function InventoryPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Cached, stale-while-revalidate read. keepPreviousData avoids flicker on paging.
  const { data: products = [], isFetching: loading } = useQuery({
    queryKey: queryKeys.inventory(`${page}:${search}`),
    queryFn: () => productService.fetchProducts(page, search),
    placeholderData: keepPreviousData,
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
        toast('Product updated!');
      } else {
        await productService.createProduct(payload);
        toast('Product saved!');
      }
      setForm(emptyForm);
      setEditId(null);
      setPage(1);
      reload();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  const startEdit = (p) => {
    setEditId(p.id);
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
      <PageHeader title="Inventory" subtitle="Manage your product stock levels" />

      <Card>
        <CardHeader title={editId ? 'Update Product' : 'Add / Update Product'} />
        <CardBody>
          <div className="form-grid">
            <Field label="Product Name">
              <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Thumbs Up 300ml" />
            </Field>
            <Field label="SKU / Code">
              <Input value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="TU-300" />
            </Field>
            <Field label="Category">
              <Select value={form.cat} onChange={(e) => set('cat', e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Unit Size">
              <Input value={form.size} onChange={(e) => set('size', e.target.value)} placeholder="300ml" />
            </Field>
            <Field label="Cases in Stock">
              <Input type="number" min="0" value={form.stock} onChange={(e) => set('stock', e.target.value)} />
            </Field>
            <Field label="Bottles per Case">
              <Input type="number" min="1" value={form.bpc} onChange={(e) => set('bpc', e.target.value)} />
            </Field>
            <Field label="Price per Case (₹)">
              <Input type="number" min="0" value={form.price} onChange={(e) => set('price', e.target.value)} />
            </Field>
            <Field label="Reorder Level">
              <Input type="number" min="0" value={form.reorder} onChange={(e) => set('reorder', e.target.value)} />
            </Field>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={handleSave}>{editId ? '💾 Update Product' : '💾 Save Product'}</Button>
            <Button
              variant="ghost"
              onClick={() => {
                setForm(emptyForm);
                setEditId(null);
              }}
            >
              ✕ Clear
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Product Catalog">
          <SearchBar
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search products…"
          />
        </CardHeader>
        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            ⬅ Prev
          </Button>
          <Button variant="ghost" size="sm" disabled={!hasNext} onClick={() => setPage((p) => p + 1)}>
            Next ➡
          </Button>
        </div>
        <CardBody flush>
          <div className="tbl-scroll tbl-inventory px-2 md:px-4">
            <table>
              <thead>
                <tr className="text-left text-[0.65rem] font-bold uppercase tracking-wider text-muted">
                  <th className="bg-card p-3">Product</th>
                  <th className="bg-card p-3">SKU</th>
                  <th className="bg-card p-3">Category</th>
                  <th className="bg-card p-3">Size</th>
                  <th className="bg-card p-3">Stock</th>
                  <th className="bg-card p-3">Price</th>
                  <th className="bg-card p-3">Status</th>
                  <th className="bg-card p-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center italic text-muted">
                      Loading…
                    </td>
                  </tr>
                ) : !products.length ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center italic text-muted">
                      No products found
                    </td>
                  </tr>
                ) : (
                  products.map((p) => {
                    const pct = p.reorder > 0 ? (p.stock / p.reorder) * 100 : 100;
                    const status =
                      p.stock <= 0 ? (
                        <Badge tone="red">Out of Stock</Badge>
                      ) : p.stock <= p.reorder ? (
                        <Badge tone="amber">Low Stock</Badge>
                      ) : (
                        <Badge tone="green">In Stock</Badge>
                      );
                    return (
                      <tr key={p.id} className="border-t border-border/30 hover:bg-white/[0.02]">
                        <td className="p-3 font-semibold">{p.name}</td>
                        <td className="p-3 text-muted">{p.sku}</td>
                        <td className="p-3">
                          <Badge>{p.cat}</Badge>
                        </td>
                        <td className="p-3 text-muted">{p.size}</td>
                        <td className="p-3">
                          <strong>{fmtNum(p.stock)}</strong>
                          <div className="mt-1 h-1.5 overflow-hidden rounded bg-border">
                            <div
                              className={`h-full ${p.stock <= p.reorder ? 'bg-amber-500' : 'bg-green-500'}`}
                              style={{ width: `${Math.min(100, pct)}%` }}
                            />
                          </div>
                        </td>
                        <td className="p-3">{fmt(p.price)}</td>
                        <td className="p-3">{status}</td>
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => startEdit(p)}>
                              ✏️
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => handleDelete(p.id)}>
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
    </div>
  );
}
