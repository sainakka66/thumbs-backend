import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

/**
 * Accessible custom select that supports avatar / image rows (native <select> can't).
 * options: [{ value, label, sub, image, initials }]
 */
export default function PickerSelect({ value, onChange, options = [], placeholder = 'Select…', searchable = true }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const selected = options.find((o) => String(o.value) === String(value));
  const filtered = q
    ? options.filter((o) => `${o.label} ${o.sub || ''}`.toLowerCase().includes(q.toLowerCase()))
    : options;

  const Avatar = ({ o, size = 'h-8 w-8' }) =>
    o?.image ? (
      <span className={`grid ${size} shrink-0 place-items-center overflow-hidden rounded-lg border border-border bg-white`}>
        <img src={o.image} alt="" className="h-full w-full object-contain p-0.5" />
      </span>
    ) : (
      <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-brand/12 text-xs font-bold text-brand`}>
        {o?.initials || '?'}
      </span>
    );

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-left outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected ? (
          <>
            <Avatar o={selected} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-text">{selected.label}</span>
              {selected.sub && <span className="block truncate text-xs text-muted">{selected.sub}</span>}
            </span>
          </>
        ) : (
          <span className="flex-1 text-sm text-muted">{placeholder}</span>
        )}
        <ChevronDown size={16} className="shrink-0 text-muted" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-elev animate-scale-in">
          {searchable && (
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
              <Search size={15} className="text-muted" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
              />
            </div>
          )}
          <ul className="max-h-60 overflow-y-auto py-1" role="listbox">
            {!filtered.length && <li className="px-3 py-4 text-center text-sm text-muted">No matches</li>}
            {filtered.map((o) => {
              const active = String(o.value) === String(value);
              return (
                <li key={o.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => { onChange(o.value); setOpen(false); setQ(''); }}
                    className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-surface2 ${active ? 'bg-brand/5' : ''}`}
                  >
                    <Avatar o={o} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-text">{o.label}</span>
                      {o.sub && <span className="block truncate text-xs text-muted">{o.sub}</span>}
                    </span>
                    {active && <Check size={16} className="shrink-0 text-brand" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
