const { ForbiddenError } = require('../../lib/errors');
const { normalizeRoleSlug } = require('../../lib/rbac/roleMap');

function requireRole(...roles) {
  const allowed = roles.map((r) => normalizeRoleSlug(r));
  return (req, res, next) => {
    const slug = req.roleSlug || normalizeRoleSlug(req.authUser?.role || req.user?.role);
    if (!allowed.includes(slug)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}

module.exports = requireRole;
