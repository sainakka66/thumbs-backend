import { useEffect, useState } from 'react';
import Button from '../ui/Button';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.info('[PWA] already running as installed app (standalone)');
      setInstalled(true);
      return;
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      console.info('[PWA] app installable');
      console.info('[PWA] beforeinstallprompt fired — native install prompt available');
    };

    const onInstalled = () => {
      console.info('[PWA] appinstalled — user completed install');
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    const timer = setTimeout(() => {
      if (!window.matchMedia('(display-mode: standalone)').matches) {
        console.warn(
          '[PWA] beforeinstallprompt not fired yet. Check manifest URL, sw.js, icons 192+512, and reload after SW controls page.'
        );
      }
    }, 8000);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (installed || dismissed || !deferredPrompt) return null;

  const handleInstall = async () => {
    console.info('[PWA] showing native install prompt');
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.info('[PWA] install prompt outcome:', outcome);
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
        Install the app for full-screen mode and offline access (Android Chrome install dialog).
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
