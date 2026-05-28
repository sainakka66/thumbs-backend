const { getSecurityConfig } = require('../../config/securityConfig');

function httpsEnforce(req, res, next) {
  const config = getSecurityConfig();
  if (!config.enforceHttps) return next();

  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  if (proto !== 'https') {
    const host = req.headers.host;
    if (host) {
      return res.redirect(301, `https://${host}${req.originalUrl}`);
    }
    return res.status(403).json({ success: false, message: 'HTTPS required' });
  }
  next();
}

function hstsHeader(req, res, next) {
  const config = getSecurityConfig();
  if (config.enforceHttps) {
    res.setHeader('Strict-Transport-Security', `max-age=${config.hstsMaxAge}; includeSubDomains; preload`);
  }
  next();
}

module.exports = { httpsEnforce, hstsHeader };
