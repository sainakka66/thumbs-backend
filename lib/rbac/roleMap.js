/** Map legacy JWT/DB role strings to enterprise role slugs. */
const LEGACY_TO_SLUG = {
  admin: 'ADMIN',
  administrator: 'ADMIN',
  manager: 'MANAGER',
  distributor: 'MANAGER',
  user: 'SALESPERSON',
  salesperson: 'SALESPERSON',
  sales: 'SALESPERSON',
  delivery: 'DELIVERY',
  delivery_agent: 'DELIVERY',
  customer: 'CUSTOMER',
  merchant: 'MERCHANT',
  support: 'SUPPORT',
  finance: 'FINANCE',
  super_admin: 'SUPER_ADMIN',
};

const KNOWN_SLUGS = new Set([
  'ADMIN', 'SUPER_ADMIN', 'MANAGER', 'SALESPERSON', 'DELIVERY_AGENT', 'DELIVERY',
  'CUSTOMER', 'MERCHANT', 'SUPPORT', 'FINANCE',
]);

function normalizeRoleSlug(role) {
  if (!role) return 'SALESPERSON';
  const key = String(role).trim();
  const upper = key.toUpperCase();
  if (KNOWN_SLUGS.has(upper)) {
    if (upper === 'DELIVERY_AGENT') return 'DELIVERY';
    return upper;
  }
  return LEGACY_TO_SLUG[key.toLowerCase()] || 'SALESPERSON';
}

module.exports = { LEGACY_TO_SLUG, normalizeRoleSlug };
