const { ForbiddenError } = require('../../lib/errors');

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.authUser?.role || 'user';
    if (!roles.includes(role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}

module.exports = requireRole;
