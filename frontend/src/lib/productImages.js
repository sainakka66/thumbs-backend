/**
 * Map a product name to a beverage product image (served from /public/products).
 * Matches the approved mockups (Thumbs Up, Coca-Cola, Sprite, Fanta, Limca, Kinley).
 */
const MAP = [
  { test: /(thums|thumbs)\s*up/i, src: '/products/prod-thumbsup.png' },
  { test: /coca|coke/i, src: '/products/prod-cocacola.png' },
  { test: /sprite/i, src: '/products/prod-sprite.png' },
  { test: /fanta/i, src: '/products/prod-fanta.png' },
  { test: /limca/i, src: '/products/prod-limca.png' },
  { test: /kinley|water/i, src: '/products/prod-kinley.png' },
];

const FALLBACK = '/products/prod-generic.png';

export function productImage(name = '') {
  const n = String(name || '');
  for (const m of MAP) {
    if (m.test.test(n)) return m.src;
  }
  return FALLBACK;
}
