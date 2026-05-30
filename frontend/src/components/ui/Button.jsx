const variants = {
  primary: 'bg-brand hover:bg-brand-dark text-white shadow-sm',
  secondary: 'bg-surface2 text-text hover:bg-border',
  ghost: 'bg-transparent border border-border text-sub hover:text-text hover:border-sub',
  green: 'bg-success/15 border border-success/30 text-success hover:bg-success/25',
  danger: 'bg-danger/15 border border-danger/30 text-danger hover:bg-danger/25',
};

const sizes = {
  md: 'px-4 py-2.5 min-h-[44px] text-sm',
  sm: 'px-3 py-2 min-h-[38px] text-[0.8rem]',
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
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold tracking-tight transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
