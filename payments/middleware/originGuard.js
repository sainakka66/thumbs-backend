const { getCorsOrigins } = require('../../config');
const { ForbiddenError } = require('../../lib/errors');

/**
 * JWT bearer auth — CSRF mitigated via Origin/Referer validation on state-changing routes.
 */
function originGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();

  const origin = req.headers.origin || req.headers.referer;
  if (!origin) {
    if (process.env.NODE_ENV === 'production' && req.path.startsWith('/payments')) {
      return next(new ForbiddenError('Origin header required'));
    }
    return next();
  }

  const allowed = getCorsOrigins();
  const ok = allowed.some((a) => origin.startsWith(a));
  if (!ok) {
    return next(new ForbiddenError('Invalid request origin'));
  }
  next();
}

module.exports = originGuard;
