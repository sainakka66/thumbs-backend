const styles = {
  green: 'bg-success/12 text-success',
  amber: 'bg-warning/12 text-warning',
  red: 'bg-danger/12 text-danger',
  blue: 'bg-info/12 text-info',
  neutral: 'bg-surface2 text-sub',
};

export default function Badge({ children, tone = 'blue', dot = false }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[0.72rem] font-semibold ${styles[tone] || styles.blue}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
