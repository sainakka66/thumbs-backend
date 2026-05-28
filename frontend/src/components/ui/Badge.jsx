const styles = {
  green: 'bg-green-500/15 text-green-400',
  amber: 'bg-amber-500/15 text-amber-400',
  red: 'bg-brand/20 text-red-300',
  blue: 'bg-blue-500/15 text-blue-400',
};

export default function Badge({ children, tone = 'blue' }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold uppercase tracking-wide ${styles[tone]}`}
    >
      {children}
    </span>
  );
}
