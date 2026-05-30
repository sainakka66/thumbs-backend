const accents = {
  brand: 'bg-brand/12 text-brand',
  green: 'bg-success/12 text-success',
  amber: 'bg-warning/12 text-warning',
  blue: 'bg-info/12 text-info',
};

/**
 * Fintech-style metric card. `icon` may be a Lucide component or a node.
 */
export default function StatCard({ label, value, sub, icon: Icon, accent = 'brand', trend }) {
  const tint = accents[accent] || accents.brand;
  return (
    <div className="surface-card min-w-0 p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-elev md:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[0.72rem] font-semibold uppercase tracking-wide text-muted">{label}</div>
        {Icon && (
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tint}`}>
            {typeof Icon === 'function' ? <Icon size={18} strokeWidth={2.2} /> : Icon}
          </span>
        )}
      </div>
      <div className="mt-2 font-head text-[clamp(1.4rem,5vw,2rem)] font-extrabold leading-tight text-text">
        {value}
      </div>
      {(sub || trend) && (
        <div className="mt-1 flex items-center gap-2 text-xs">
          {trend != null && (
            <span className={trend >= 0 ? 'font-semibold text-success' : 'font-semibold text-danger'}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}%
            </span>
          )}
          {sub && <span className="text-muted">{sub}</span>}
        </div>
      )}
    </div>
  );
}
