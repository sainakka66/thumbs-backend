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
};

function normalizeRoleSlug(role) {
  if (!role) return 'SALESPERSON';
  const key = String(role).trim();
  const upper = key.toUpperCase();
  if (['ADMIN', 'MANAGER', 'SALESPERSON', 'DELIVERY_AGENT', 'DELIVERY', 'CUSTOMER'].includes(upper)) {
    if (upper === 'DELIVERY_AGENT') return 'DELIVERY';
    return upper;
  }
  return LEGACY_TO_SLUG[key.toLowerCase()] || 'SALESPERSON';
}

module.exports = { LEGACY_TO_SLUG, normalizeRoleSlug };
