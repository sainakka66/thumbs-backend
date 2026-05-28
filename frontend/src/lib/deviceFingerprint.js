export function getDeviceFingerprint() {
  try {
    const parts = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    ];
    const raw = parts.join('|');
    let hash = 0;
    for (let i = 0; i < raw.length; i += 1) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `fp_${Math.abs(hash).toString(36)}`;
  } catch {
    return null;
  }
}
