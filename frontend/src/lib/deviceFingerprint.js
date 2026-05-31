const STORAGE_KEY = 'thumbs-device-id';

function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(16).padStart(8, '0');
}

export function getOrCreateDeviceId() {
  try {
    let id = localStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = `dev_${crypto.randomUUID?.() || Date.now()}`;
      localStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    return `dev_${Date.now()}`;
  }
}

export function getDeviceSignals() {
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const screen = typeof window !== 'undefined' ? window.screen : {};
  const raw = [
    getOrCreateDeviceId(),
    nav.userAgent,
    nav.language,
    screen.width,
    screen.height,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  ].join('|');
  return {
    fingerprint: `fp_${hashString(raw)}`,
    deviceLabel: `${nav.platform || 'Device'} · ${/Chrome/i.test(nav.userAgent || '') ? 'Chrome' : 'Browser'}`,
    browser: /Firefox/i.test(nav.userAgent || '') ? 'Firefox' : /Chrome/i.test(nav.userAgent || '') ? 'Chrome' : 'Browser',
    os: /Windows/i.test(nav.userAgent || '') ? 'Windows' : /Mac/i.test(nav.userAgent || '') ? 'macOS' : /Android/i.test(nav.userAgent || '') ? 'Android' : 'OS',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: nav.language,
  };
}

export function deviceHeaders() {
  const s = getDeviceSignals();
  return {
    'X-Device-Fingerprint': s.fingerprint,
    'X-Timezone': s.timezone,
  };
}

/** Used by api.js */
export function getDeviceFingerprint() {
  return getDeviceSignals().fingerprint;
}
