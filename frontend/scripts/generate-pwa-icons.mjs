/**
 * Generates PWA PNG icons from brand SVG (run via prebuild).
 */
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const brandSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#D42B2B"/>
  <text x="256" y="300" text-anchor="middle" font-size="200" fill="#FFFFFF">👍</text>
</svg>`;

const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#D42B2B"/>
  <text x="256" y="290" text-anchor="middle" font-size="160" fill="#FFFFFF">👍</text>
</svg>`;

async function writePng(name, size, svg) {
  const out = path.join(publicDir, name);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log('wrote', out);
}

if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

await writePng('pwa-192x192.png', 192, brandSvg);
await writePng('pwa-512x512.png', 512, brandSvg);
await writePng('pwa-512x512-maskable.png', 512, maskableSvg);
await writePng('apple-touch-icon.png', 180, brandSvg);
