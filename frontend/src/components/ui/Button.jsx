const variants = {
  primary: 'bg-brand hover:bg-brand-light text-white',
  ghost: 'bg-transparent border border-border text-sub hover:text-text hover:border-sub',
  green: 'bg-green-500/15 border border-green-500/30 text-green-400 hover:bg-green-500/25',
  danger: 'bg-brand/15 border border-brand/30 text-red-300 hover:bg-brand/30',
};

const sizes = {
  md: 'px-4 py-2.5 min-h-[44px] text-sm',
  sm: 'px-3 py-1.5 min-h-[40px] text-xs',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-head font-bold uppercase tracking-wide transition ${variants[variant]} ${sizes[size]} disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
