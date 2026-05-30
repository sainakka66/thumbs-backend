import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const required = [
  'manifest.webmanifest',
  'sw.js',
  'apple-touch-icon.png',
  'pwa-192x192-maskable.png',
  'pwa-512x512-maskable.png',
  ...ICON_SIZES.map((s) => `pwa-${s}x${s}.png`),
];
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');

let failed = false;
for (const f of required) {
  if (!fs.existsSync(path.join(dist, f))) {
    console.error('MISSING:', f);
    failed = true;
  }
}
if (!html.includes('rel="manifest"')) {
  console.error('index.html missing manifest link');
  failed = true;
}
const swFiles = fs.readdirSync(dist).filter((f) => f.startsWith('workbox-') && f.endsWith('.js'));
if (!swFiles.length) {
  console.error('missing workbox bundle');
  failed = true;
}
const manifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.webmanifest'), 'utf8'));
if (manifest.display !== 'standalone') {
  console.error('manifest.display must be standalone');
  failed = true;
}
const sizes = new Set(manifest.icons?.flatMap((i) => i.sizes.split(' ')) || []);
for (const s of ICON_SIZES) {
  if (!sizes.has(`${s}x${s}`)) {
    console.error(`manifest missing ${s}x${s} icon`);
    failed = true;
  }
}
const hasMaskable = (manifest.icons || []).some((i) => (i.purpose || '').includes('maskable'));
if (!hasMaskable) {
  console.error('manifest missing a maskable icon');
  failed = true;
}
for (const field of ['name', 'short_name', 'start_url', 'scope', 'theme_color', 'background_color']) {
  if (!manifest[field]) {
    console.error(`manifest missing required field: ${field}`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log('PWA build validation passed');
