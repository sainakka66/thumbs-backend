/**
 * Production-safe PWA installability diagnostics (console).
 */
export async function runPwaDiagnostics() {
  const log = (msg, data) => console.info(`[PWA] ${msg}`, data ?? '');

  log('diagnostics start', {
    href: location.href,
    displayMode: window.matchMedia('(display-mode: standalone)').matches
      ? 'standalone'
      : 'browser',
  });

  const manifestEl = document.querySelector('link[rel="manifest"]');
  if (!manifestEl?.href) {
    console.warn('[PWA] manifest link missing from HTML');
  } else {
    try {
      const res = await fetch(manifestEl.href, { cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      const text = await res.text();
      if (!res.ok || text.trimStart().startsWith('<')) {
        console.error('[PWA] manifest fetch invalid', {
          url: manifestEl.href,
          status: res.status,
          contentType: ct,
          preview: text.slice(0, 80),
        });
      } else {
        const manifest = JSON.parse(text);
        log('manifest OK', {
          display: manifest.display,
          start_url: manifest.start_url,
          scope: manifest.scope,
          theme_color: manifest.theme_color,
          icons: manifest.icons?.map((i) => `${i.sizes} ${i.purpose || 'any'}`),
        });
      }
    } catch (e) {
      console.error('[PWA] manifest fetch failed', e);
    }
  }

  if ('serviceWorker' in navigator) {
    const reg = await navigator.serviceWorker.getRegistration();
    log('service worker registration', {
      scope: reg?.scope,
      active: !!reg?.active,
      waiting: !!reg?.waiting,
      controlling: !!navigator.serviceWorker.controller,
    });

    if (!navigator.serviceWorker.controller) {
      console.warn(
        '[PWA] page not yet controlled by SW — reload once after first visit'
      );
    } else {
      log('service worker controls page', navigator.serviceWorker.controller.scriptURL);
    }
  } else {
    console.warn('[PWA] service workers not supported');
  }

  log('waiting for beforeinstallprompt (installable if it fires on Android Chrome)');
}
