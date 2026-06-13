const { normalizeRoleSlug } = require('../../lib/rbac/roleMap');

/** Staff accounts often share a company email — duplicate check applies to CUSTOMER self-pay only. */
function shouldEnforceUniqueIdentity(authUser) {
  const slug = normalizeRoleSlug(authUser?.roleSlug || authUser?.role);
  return slug === 'CUSTOMER';
}

module.exports = { shouldEnforceUniqueIdentity };
