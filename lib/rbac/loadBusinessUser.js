const { queryRows } = require('../db/safeQuery');
const { UnauthorizedError, ForbiddenError } = require('../errors');
const { loadPermissionsForUser } = require('./permissionCache');
const { normalizeRoleSlug } = require('./roleMap');

async function loadBusinessUser(req, res, next) {
  try {
    if (!req.user?.id) {
      return next(new UnauthorizedError('Invalid session'));
    }

    let rows;
    try {
      rows = await queryRows(
        `SELECT id, username, email, phone, role, role_id, status, is_active, deleted_at
         FROM users WHERE id = ? LIMIT 1`,
        [req.user.id]
      );
    } catch (e) {
      if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
      rows = await queryRows('SELECT id, username, role FROM users WHERE id = ? LIMIT 1', [
        req.user.id,
      ]);
      if (rows[0]) {
        rows[0].status = 'active';
        rows[0].is_active = 1;
        rows[0].role_id = null;
      }
    }

    const user = rows[0];
    if (!user || user.deleted_at || user.is_active === 0) {
      return next(new UnauthorizedError('Account inactive'));
    }
    if (user.status === 'banned' || user.status === 'suspended') {
      return next(new ForbiddenError('Account restricted'));
    }

    const { roleSlug, permissions } = await loadPermissionsForUser(user);
    req.businessUser = user;
    req.authUser = user;
    req.roleSlug = roleSlug;
    req.permissions = permissions;
    user.roleSlug = roleSlug;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = loadBusinessUser;
