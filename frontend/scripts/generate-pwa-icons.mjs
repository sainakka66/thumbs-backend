/**
 * Generates opaque PWA PNG icons (Android installability requires valid 192/512 PNGs).
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

/** Vector-only SVG — no emoji (reliable on CI/Linux and Android validators). */
const brandSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#D42B2B"/>
  <rect x="156" y="140" width="200" height="200" rx="40" fill="#FFFFFF" opacity="0.95"/>
  <text x="256" y="280" text-anchor="middle" font-family="Arial,Helvetica,sans-serif"
        font-size="120" font-weight="700" fill="#D42B2B">TU</text>
</svg>`;

const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#D42B2B"/>
  <text x="256" y="290" text-anchor="middle" font-family="Arial,Helvetica,sans-serif"
        font-size="140" font-weight="700" fill="#FFFFFF">TU</text>
</svg>`;

async function writePng(name, size, svg) {
  const out = path.join(publicDir, name);
  await sharp(Buffer.from(svg))
    .resize(size, size, { fit: 'cover' })
    .flatten({ background: '#D42B2B' })
    .png({ compressionLevel: 9 })
    .toFile(out);
  const meta = await sharp(out).metadata();
  console.log('wrote', out, `${meta.width}x${meta.height}`, meta.format);
}

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

// Full installable icon set (Android/Chrome + iOS + general PWA validators).
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of ICON_SIZES) {
  await writePng(`pwa-${size}x${size}.png`, size, brandSvg);
}

// Maskable variants (Android adaptive icons): 192 + 512.
await writePng('pwa-192x192-maskable.png', 192, maskableSvg);
await writePng('pwa-512x512-maskable.png', 512, maskableSvg);

// iOS home-screen icon.
await writePng('apple-touch-icon.png', 180, brandSvg);
