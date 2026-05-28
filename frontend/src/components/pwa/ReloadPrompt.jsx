import { useRegisterSW } from 'virtual:pwa-register/react';
import Button from '../ui/Button';

export default function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(registration) {
      if (import.meta.env.DEV) {
        console.info('[PWA] service worker registered', registration?.scope);
      }
    },
    onRegisterError(error) {
      console.error('[PWA] registration failed', error);
    },
  });

  const dismiss = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!offlineReady && !needRefresh) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-[10000] mx-auto max-w-md rounded-lg border border-border bg-surface p-4 shadow-card md:left-auto md:right-6"
      role="alert"
    >
      {offlineReady && (
        <p className="mb-3 text-sm text-sub">
          App ready to work offline. Static pages and cached reads are available.
        </p>
      )}
      {needRefresh && (
        <p className="mb-3 text-sm text-text font-medium">A new version is available.</p>
      )}
      <div className="flex flex-wrap gap-2">
        {needRefresh && (
          <Button size="sm" onClick={() => updateServiceWorker(true)}>
            Update now
          </Button>
        )}
        <Button variant="ghost" size="sm" onClick={dismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
