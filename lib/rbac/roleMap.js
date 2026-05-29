/** Map legacy JWT/DB role strings to enterprise role slugs. */
const LEGACY_TO_SLUG = {
  admin: 'ADMIN',
  administrator: 'ADMIN',
  manager: 'MANAGER',
  distributor: 'MANAGER',
  user: 'SALESPERSON',
  salesperson: 'SALESPERSON',
  sales: 'SALESPERSON',
  delivery: 'DELIVERY_AGENT',
  delivery_agent: 'DELIVERY_AGENT',
};

function normalizeRoleSlug(role) {
  if (!role) return 'SALESPERSON';
  const key = String(role).trim();
  const upper = key.toUpperCase();
  if (['ADMIN', 'MANAGER', 'SALESPERSON', 'DELIVERY_AGENT'].includes(upper)) {
    return upper;
  }
  return LEGACY_TO_SLUG[key.toLowerCase()] || 'SALESPERSON';
}

module.exports = { LEGACY_TO_SLUG, normalizeRoleSlug };
