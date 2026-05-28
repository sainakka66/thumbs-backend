const { queryRows } = require('../../lib/db/safeQuery');
const { UnauthorizedError, ForbiddenError } = require('../../lib/errors');

async function loadAuthUser(req, res, next) {
  try {
    if (!req.user?.id) {
      return next(new UnauthorizedError('Invalid session'));
    }
    let rows;
    try {
      rows = await queryRows(
        `SELECT id, username, email, phone, role, status, is_active, deleted_at
         FROM users WHERE id = ? LIMIT 1`,
        [req.user.id]
      );
    } catch (e) {
      if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
      rows = await queryRows(
        'SELECT id, username FROM users WHERE id = ? LIMIT 1',
        [req.user.id]
      );
      if (rows[0]) {
        rows[0].role = req.user.role || 'user';
        rows[0].status = 'active';
        rows[0].is_active = 1;
      }
    }
    const user = rows[0];
    if (!user || user.deleted_at || !user.is_active) {
      return next(new UnauthorizedError('Account inactive'));
    }
    if (user.status === 'banned' || user.status === 'suspended') {
      return next(new ForbiddenError('Account restricted'));
    }
    req.authUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = loadAuthUser;
