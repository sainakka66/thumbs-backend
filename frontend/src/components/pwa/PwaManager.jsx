import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { runPwaDiagnostics } from '../../lib/pwaDiagnostics';
import { initBackgroundSync } from '../../lib/offlineQueue';
import OfflineBanner from './OfflineBanner';
import InstallPrompt from './InstallPrompt';
import Button from '../ui/Button';

/**
 * Single PWA entry: SW registration (immediate), update UI, install prompt, diagnostics.
 */
export default function PwaManager({ children }) {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(swUrl, registration) {
      console.info('[PWA] service worker registered', {
        url: swUrl,
        scope: registration?.scope,
        active: !!registration?.active,
      });
    },
    onRegisterError(error) {
      console.error('[PWA] service worker registration failed', error);
    },
  });

  useEffect(() => {
    runPwaDiagnostics();
    initBackgroundSync();
  }, []);

  useEffect(() => {
    if (offlineReady) {
      console.info('[PWA] app installable offline (static assets precached)');
    }
  }, [offlineReady]);

  const dismissUpdate = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  return (
    <>
      <OfflineBanner />
      {children}
      <InstallPrompt />
      {(offlineReady || needRefresh) && (
        <div
          className="fixed bottom-4 left-4 right-4 z-[10000] mx-auto max-w-md rounded-lg border border-border bg-surface p-4 shadow-card md:left-auto md:right-6"
          role="alert"
        >
          {offlineReady && (
            <p className="mb-3 text-sm text-sub">
              App ready to work offline. Reload once if install prompt does not appear.
            </p>
          )}
          {needRefresh && (
            <p className="mb-3 text-sm font-medium text-text">A new version is available.</p>
          )}
          <div className="flex flex-wrap gap-2">
            {needRefresh && (
              <Button size="sm" onClick={() => updateServiceWorker(true)}>
                Update now
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={dismissUpdate}>
              Dismiss
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
