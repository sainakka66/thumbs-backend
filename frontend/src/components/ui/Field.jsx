export function Field({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="text-[0.72rem] font-bold uppercase tracking-wider text-sub">{label}</label>
      )}
      {children}
    </div>
  );
}

export const inputClass =
  'w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-text outline-none transition-colors placeholder:text-muted focus:border-brand focus:ring-2 focus:ring-brand/20 md:text-sm';

export function Input(props) {
  return <input className={inputClass} {...props} />;
}

export function Select(props) {
  return (
    <select className={`${inputClass} appearance-none`} {...props} />
  );
}

export function Textarea(props) {
  return <textarea className={`${inputClass} min-h-[80px]`} {...props} />;
}
