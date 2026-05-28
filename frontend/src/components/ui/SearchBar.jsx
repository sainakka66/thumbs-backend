export default function SearchBar({ value, onChange, placeholder = 'Search…' }) {
  return (
    <div className="flex w-full min-w-0 items-center gap-2 rounded-md border border-border bg-card px-3 py-2 sm:max-w-xs">
      <span className="text-muted">🔍</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border-none bg-transparent text-base text-text outline-none md:text-sm"
      />
    </div>
  );
}
