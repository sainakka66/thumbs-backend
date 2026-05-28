import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
const required = ['manifest.webmanifest', 'sw.js', 'pwa-192x192.png', 'pwa-512x512.png'];
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
if (!sizes.has('192x192') || !sizes.has('512x512')) {
  console.error('manifest must include 192x192 and 512x512 icons');
  failed = true;
}
if (failed) process.exit(1);
console.log('PWA build validation passed');
