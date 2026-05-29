import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as businessService from '../../services/businessService';

export default function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q || q.length < 2) {
      setResults(null);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await businessService.globalSearch(q);
        setResults(data.results);
        setOpen(true);
      } catch {
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div className="relative hidden min-w-0 flex-1 max-w-md md:block">
      <input
        type="search"
        placeholder="Search customers, products, sales…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => q.length >= 2 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
      />
      {loading && <span className="absolute right-3 top-2.5 text-xs text-muted">…</span>}
      {open && results && (
        <div className="absolute left-0 right-0 top-full z-[200] mt-1 max-h-80 overflow-y-auto rounded-lg border border-border bg-surface shadow-xl">
          {['customers', 'inventory', 'sales', 'deliveries'].map((group) =>
            results[group]?.length ? (
              <div key={group} className="border-b border-border/50 p-2">
                <div className="px-2 py-1 text-[0.65rem] font-bold uppercase text-muted">{group}</div>
                {results[group].map((row) => (
                  <Link
                    key={`${group}-${row.id}`}
                    to={
                      group === 'customers'
                        ? '/customers'
                        : group === 'inventory'
                          ? '/inventory'
                          : group === 'sales'
                            ? '/sales'
                            : '/deliveries'
                    }
                    className="block rounded px-2 py-1.5 text-sm hover:bg-white/5"
                    onClick={() => setOpen(false)}
                  >
                    {row.shop_name || row.name || row.Name || row.product_name || `#${row.id}`}
                  </Link>
                ))}
              </div>
            ) : null
          )}
          {!results.customers?.length &&
            !results.inventory?.length &&
            !results.sales?.length &&
            !results.deliveries?.length && (
              <p className="p-4 text-sm text-muted">No results</p>
            )}
        </div>
      )}
    </div>
  );
}
