import { useEffect, useState } from 'react';
import Button from '../ui/Button';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || dismissed || !deferredPrompt) return null;

  const handleInstall = async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (import.meta.env.DEV) console.info('[PWA] install prompt:', outcome);
    setDeferredPrompt(null);
    if (outcome === 'accepted') setInstalled(true);
  };

  return (
    <div
      className="fixed bottom-20 left-4 right-4 z-[9999] mx-auto max-w-md rounded-lg border border-brand/40 bg-surface p-4 shadow-card md:bottom-6 md:left-auto md:right-6"
      role="dialog"
      aria-label="Install app"
    >
      <p className="mb-1 font-head text-base font-bold text-text">Install Thumbs Up</p>
      <p className="mb-3 text-sm text-sub">
        Add to your home screen for quick access and a full-screen app experience on Android.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handleInstall}>
          Install app
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDismissed(true)}>
          Not now
        </Button>
      </div>
    </div>
  );
}
