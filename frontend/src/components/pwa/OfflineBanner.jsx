import { useOnlineStatus } from '../../hooks/useOnlineStatus';

export default function OfflineBanner() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <div
      role="status"
      className="fixed left-0 right-0 top-0 z-[10000] border-b border-amber-500/40 bg-amber-950/95 px-4 py-2.5 text-center text-sm text-amber-200 safe-top"
    >
      You are offline. Cached data may be shown; sign-in and live updates need a connection.
    </div>
  );
}
