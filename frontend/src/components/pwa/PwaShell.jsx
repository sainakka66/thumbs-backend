import OfflineBanner from './OfflineBanner';
import ReloadPrompt from './ReloadPrompt';
import InstallPrompt from './InstallPrompt';

/** PWA UI shell — offline banner, update prompt, install prompt */
export default function PwaShell({ children }) {
  return (
    <>
      <OfflineBanner />
      {children}
      <InstallPrompt />
      <ReloadPrompt />
    </>
  );
}
