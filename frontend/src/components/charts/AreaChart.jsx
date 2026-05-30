import { useEffect, useId, useState } from 'react';

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Lightweight animated SVG area + line chart (matches the approved fintech revenue graph).
 * No charting library. data: [{ amount, date }]
 */
export default function AreaChart({ data = [], valueKey = 'amount', labelKey = 'date', height = 180 }) {
  const rows = Array.isArray(data) ? data : [];
  const gid = useId().replace(/:/g, '');
  const [draw, setDraw] = useState(prefersReduced() ? 1 : 0);

  useEffect(() => {
    if (prefersReduced()) return undefined;
    let raf;
    const start = performance.now();
    const dur = 700;
    const tick = (t) => {
      const p = Math.min((t - start) / dur, 1);
      setDraw(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [rows.map((r) => r[valueKey]).join(',')]);

  if (!rows.length) return <p className="text-sm text-muted">No data for this period</p>;

  const W = 600;
  const H = height;
  const pad = 8;
  const max = Math.max(...rows.map((r) => Number(r[valueKey]) || 0), 1);
  const stepX = rows.length > 1 ? (W - pad * 2) / (rows.length - 1) : 0;
  const pts = rows.map((r, i) => {
    const x = pad + i * stepX;
    const y = H - pad - ((Number(r[valueKey]) || 0) / max) * (H - pad * 2) * draw;
    return [x, y];
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = `${line} L${pts[pts.length - 1][0].toFixed(1)},${H - pad} L${pts[0][0].toFixed(1)},${H - pad} Z`;
  const last = pts[pts.length - 1];

  const fmtLabel = (v) =>
    typeof v === 'string' && v.length > 6
      ? new Date(v).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      : String(v ?? '');

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        <defs>
          <linearGradient id={`area-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(var(--brand))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="rgb(var(--brand))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#area-${gid})`} />
        <path d={line} fill="none" stroke="rgb(var(--brand))" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={last[0]} cy={last[1]} r="4" fill="rgb(var(--brand))" stroke="rgb(var(--surface))" strokeWidth="2" />
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[0.6rem] text-muted">
        {rows.map((r, i) => (
          <span key={i} className="truncate">{i % Math.ceil(rows.length / 7 || 1) === 0 ? fmtLabel(r[labelKey]) : ''}</span>
        ))}
      </div>
    </div>
  );
}
