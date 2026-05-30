/** Lightweight shimmer skeletons — shown instead of blank screens while data loads. */

export function Skeleton({ className = '', style }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <Skeleton className="mb-3 h-3 w-1/2" />
      <Skeleton className="h-7 w-3/4" />
    </div>
  );
}

export function SkeletonStatGrid({ count = 8 }) {
  return (
    <div className="stat-grid mb-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonChart({ height = 140 }) {
  const bars = [0.4, 0.7, 0.55, 0.9, 0.5, 0.75, 0.6, 0.85];
  return (
    <div className="flex items-end gap-2 px-1" style={{ height }}>
      {bars.map((h, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: `${Math.round(h * (height - 20))}px` }} />
      ))}
    </div>
  );
}

export function SkeletonCard({ children }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      {children || (
        <>
          <Skeleton className="mb-4 h-4 w-1/3" />
          <SkeletonText lines={4} />
        </>
      )}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 4 }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex gap-4 border-b border-border bg-white/5 p-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b border-border/50 p-3">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Full-page fallback for lazy route Suspense — never a blank screen. */
export function PageSkeleton() {
  return (
    <div className="page-container pb-20 lg:pb-0">
      <div className="mb-6">
        <Skeleton className="mb-2 h-7 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <SkeletonStatGrid count={6} />
      <div className="dash-grid">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
