export default function SimpleBarChart({ data, valueKey = 'amount', labelKey = 'date', height = 120 }) {
  const rows = Array.isArray(data) ? data : [];
  if (!rows.length) {
    return <p className="text-sm text-muted">No data for this period</p>;
  }

  const max = Math.max(...rows.map((d) => Number(d[valueKey]) || 0), 1);

  return (
    <div className="flex items-end gap-1 px-1" style={{ height }}>
      {rows.map((d, i) => {
        const val = Number(d[valueKey]) || 0;
        const h = Math.max(4, (val / max) * (height - 24));
        const label = d[labelKey]
          ? typeof d[labelKey] === 'string' && d[labelKey].length > 6
            ? new Date(d[labelKey]).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
            : String(d[labelKey]).slice(0, 3)
          : i + 1;
        return (
          <div key={i} className="flex flex-1 flex-col items-center gap-1 min-w-0">
            <div
              className="w-full rounded-t bg-brand transition-all"
              style={{ height: h }}
              title={String(val)}
            />
            <span className="w-full truncate text-center text-[0.6rem] text-muted">{label}</span>
          </div>
        );
      })}
    </div>
  );
}
