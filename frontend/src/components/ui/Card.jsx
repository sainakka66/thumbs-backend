export function Card({ children, className = '' }) {
  return (
    <div className={`w-full max-w-full min-w-0 rounded-md border border-border bg-surface overflow-hidden mb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ title, children, className = '' }) {
  return (
    <div
      className={`flex flex-col gap-3 border-b border-border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <h3 className="font-head text-sm font-bold uppercase tracking-wider text-text">{title}</h3>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '', flush }) {
  return (
    <div className={`${flush ? 'p-0 pb-3' : 'p-4 md:p-5'} ${className}`}>{children}</div>
  );
}
