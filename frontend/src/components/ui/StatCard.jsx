export default function StatCard({ label, value, sub, icon, accent = 'brand' }) {
  const accentColors = {
    brand: 'bg-brand',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
  };

  return (
    <div className="relative min-w-0 w-full overflow-hidden rounded-md border border-border bg-surface px-4 py-4 md:px-5">
      <div className={`absolute left-0 right-0 top-0 h-0.5 ${accentColors[accent] || accentColors.brand}`} />
      {icon && <span className="absolute right-4 top-4 text-3xl opacity-15">{icon}</span>}
      <div className="text-[0.72rem] font-bold uppercase tracking-wider text-sub">{label}</div>
      <div className="mt-2 font-head text-[clamp(1.35rem,6vw,2.2rem)] font-extrabold leading-tight break-words">
        {value}
      </div>
      {sub && <div className="mt-1.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}
