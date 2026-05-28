export default function LoadingOverlay({ show }) {
  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center gap-4 bg-ink">
      <div className="animate-pulse font-head text-4xl font-extrabold text-brand">👍 THUMBS UP</div>
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-brand" />
    </div>
  );
}
