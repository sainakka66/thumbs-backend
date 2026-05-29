const { ForbiddenError } = require('../errors');
const { normalizeRoleSlug } = require('./roleMap');

function requireRole(...roleSlugs) {
  const allowed = roleSlugs.map((r) => normalizeRoleSlug(r));
  return (req, res, next) => {
    const slug = req.roleSlug || normalizeRoleSlug(req.businessUser?.role || req.user?.role);
    if (!allowed.includes(slug)) {
      return next(new ForbiddenError('Insufficient role'));
    }
    next();
  };
}

module.exports = requireRole;
