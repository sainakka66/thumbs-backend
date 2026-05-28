const { getSecurityConfig } = require('../../config/securityConfig');
const { ForbiddenError } = require('../../lib/errors');
const { logAdminAction } = require('../repositories/securityRepository');

function adminIpAllowlist(req, res, next) {
  const config = getSecurityConfig();
  if (!config.adminIpAllowlist.length) return next();

  const ip = req.clientIp || req.ip;
  if (!config.adminIpAllowlist.includes(ip)) {
    return next(new ForbiddenError('Admin access denied from this IP'));
  }
  next();
}

function adminSessionTimeout(req, res, next) {
  if (!req.user?.iat) return next();
  const maxSec = getSecurityConfig().adminSessionMaxMin * 60;
  const age = Math.floor(Date.now() / 1000) - req.user.iat;
  if (age > maxSec) {
    return next(new ForbiddenError('Admin session expired'));
  }
  next();
}

function adminAudit(action) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode < 400) {
        logAdminAction({
          adminUserId: req.authUser?.id,
          action,
          targetType: req.params?.id ? 'param' : 'body',
          targetId: req.params?.id || req.body?.orderUuid || req.body?.userId,
          details: { path: req.path, status: res.statusCode },
          ipAddress: req.clientIp,
        }).catch(() => {});
      }
    });
    next();
  };
}

module.exports = { adminIpAllowlist, adminSessionTimeout, adminAudit };
