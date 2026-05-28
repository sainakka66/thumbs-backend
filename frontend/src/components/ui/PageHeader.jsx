export default function PageHeader({ title, subtitle, extra }) {
  return (
    <div className="mb-5">
      <h1 className="font-head text-[clamp(1.35rem,5vw,2rem)] font-extrabold tracking-wide">{title}</h1>
      {extra && <p className="mt-1 font-head text-base font-bold text-brand">{extra}</p>}
      {subtitle && <p className="mt-1 text-sm text-sub">{subtitle}</p>}
    </div>
  );
}
