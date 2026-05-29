const loadBusinessUser = require('./loadBusinessUser');
const { requirePermission } = require('./requirePermission');

/**
 * Standard protected route stack: verifyToken must run first (passed in).
 * @param {Function} verifyToken
 * @param {string|string[]} permission
 * @param {...Function} handlers
 */
function protect(verifyToken, permission, ...handlers) {
  const perms = Array.isArray(permission) ? permission : [permission];
  return [verifyToken, loadBusinessUser, requirePermission(...perms), ...handlers];
}

function protectAny(verifyToken, permissions, ...handlers) {
  const { requireAnyPermission } = require('./requirePermission');
  return [verifyToken, loadBusinessUser, requireAnyPermission(...permissions), ...handlers];
}

module.exports = { protect, protectAny };
