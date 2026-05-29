const { ForbiddenError } = require('../errors');

function requirePermission(...slugs) {
  return (req, res, next) => {
    const perms = req.permissions;
    if (!perms) {
      return next(new ForbiddenError('Permissions not loaded'));
    }
    if (req.roleSlug === 'ADMIN') return next();
    const ok = slugs.some((s) => perms.has(s));
    if (!ok) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}

function requireAnyPermission(...slugGroups) {
  return (req, res, next) => {
    if (req.roleSlug === 'ADMIN') return next();
    const perms = req.permissions;
    const ok = slugGroups.some((s) => perms?.has(s));
    if (!ok) return next(new ForbiddenError('Insufficient permissions'));
    next();
  };
}

module.exports = { requirePermission, requireAnyPermission };
