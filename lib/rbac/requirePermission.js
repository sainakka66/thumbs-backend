const { ForbiddenError } = require('../errors');

const PRIVILEGED_ROLES = new Set(['ADMIN', 'SUPER_ADMIN']);

function isPrivilegedRole(req) {
  return PRIVILEGED_ROLES.has(req.roleSlug);
}

function hasAnyPermission(req, slugs) {
  if (isPrivilegedRole(req)) return true;
  const perms = req.permissions;
  if (!perms) return false;
  return slugs.some((s) => perms.has(s));
}

function requirePermission(...slugs) {
  return (req, res, next) => {
    if (!req.permissions) {
      return next(new ForbiddenError('Permissions not loaded'));
    }
    if (hasAnyPermission(req, slugs)) return next();
    return next(new ForbiddenError('Insufficient permissions'));
  };
}

function requireAnyPermission(...slugGroups) {
  return requirePermission(...slugGroups);
}

module.exports = { requirePermission, requireAnyPermission, isPrivilegedRole, hasAnyPermission };
