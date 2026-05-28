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
  'w-full rounded-md border border-border bg-card px-3 py-2.5 text-base text-text outline-none transition focus:border-brand md:text-sm';

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
