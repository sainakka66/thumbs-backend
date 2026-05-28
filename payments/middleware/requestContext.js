const { randomUuid } = require('../utils/crypto');

function requestContext(req, res, next) {
  req.requestId = req.headers['x-request-id'] || randomUuid();
  res.setHeader('X-Request-Id', req.requestId);
  req.clientIp =
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    null;
  req.deviceFingerprint = req.headers['x-device-fingerprint'] || null;
  req.userAgent = req.headers['user-agent'] || null;
  next();
}

module.exports = requestContext;
