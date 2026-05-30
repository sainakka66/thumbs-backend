import { useEffect, useState } from 'react';

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Lightweight animated SVG donut. No charting library (keeps bundle small).
 * segments: [{ label, value, className (text-* color) }]
 */
export default function Donut({ segments = [], size = 168, thickness = 18, centerLabel, centerValue }) {
  const [progress, setProgress] = useState(prefersReduced() ? 1 : 0);

  useEffect(() => {
    if (prefersReduced()) return undefined;
    let raf;
    const start = performance.now();
    const dur = 700;
    const tick = (t) => {
      const p = Math.min((t - start) / dur, 1);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [segments.map((s) => s.value).join(',')]);

  const total = segments.reduce((n, s) => n + (Number(s.value) || 0), 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={thickness} className="stroke-surface2" />
          {segments.map((s, i) => {
            const frac = ((Number(s.value) || 0) / total) * progress;
            const len = frac * c;
            const seg = (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                strokeWidth={thickness}
                strokeLinecap="round"
                className={s.className || 'stroke-brand'}
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += len;
            return seg;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <div className="font-head text-2xl font-extrabold leading-none text-text">{centerValue}</div>
            {centerLabel && <div className="mt-0.5 text-[0.65rem] uppercase tracking-wide text-muted">{centerLabel}</div>}
          </div>
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {segments.map((s, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${(s.className || 'stroke-brand').replace('stroke-', 'bg-')}`} />
            <span className="text-sub">{s.label}</span>
            <span className="ml-auto font-semibold text-text">{s.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
