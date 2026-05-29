const { getRateLimitStore } = require('./memoryStore');
const { getLimiterSettings } = require('./settings');
const dbCooldown = require('./dbCooldown');
const logger = require('../logger');
const { queryRows } = require('../db/safeQuery');

function buildKeys(req, prefix) {
  const ip = req.clientIp || req.ip || 'unknown';
  const userId = req.authUser?.id || req.user?.id || 'anon';
  const device = req.deviceFingerprint || 'no-device';
  return {
    ip: `${prefix}:ip:${ip}`,
    user: `${prefix}:user:${userId}`,
    device: `${prefix}:device:${device}`,
    burst: `${prefix}:burst:${ip}`,
  };
}

function createEnterpriseLimiter({ name, logSuspicious = true }) {
  const store = getRateLimitStore();

  return async function enterpriseLimiter(req, res, next) {
    try {
      const settings = await getLimiterSettings(name);
      if (!settings.enabled) {
        return next();
      }

      const keys = buildKeys(req, name);

      if (settings.cooldownMs > 0) {
        const dbCooling = await dbCooldown.isCoolingDown(name, keys.ip);
        const memCooling = store.isCoolingDown(keys.ip);
        if (dbCooling || memCooling) {
          return res.status(429).json({
            success: false,
            message: 'Cooldown active. Try again later.',
            code: 'RATE_COOLDOWN',
          });
        }
      }

      const burst = store.increment(keys.burst, settings.burstWindowMs);
      const ipCount = store.increment(keys.ip, settings.windowMs);
      const userCount = store.increment(keys.user, settings.windowMs);
      const deviceCount = store.increment(keys.device, settings.windowMs);

      const exceeded =
        burst > settings.burstMax ||
        ipCount > settings.maxIp ||
        userCount > settings.maxUser ||
        deviceCount > settings.maxDevice;

      if (exceeded) {
        if (settings.cooldownMs > 0) {
          const until = Date.now() + settings.cooldownMs;
          store.setCooldown(keys.ip, until);
          await dbCooldown.setCooldown(name, keys.ip, until);
        }
        if (logSuspicious) {
          logger.warn(
            { name, ip: req.clientIp, userId: req.authUser?.id, burst, ipCount, userCount },
            'rate_limit_exceeded'
          );
          logRetrySuspicious(req, name).catch(() => {});
        }
        res.setHeader('Retry-After', String(Math.ceil(settings.windowMs / 1000)));
        return res.status(429).json({
          success: false,
          message: 'Too many requests',
          code: 'RATE_LIMITED',
        });
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

async function logRetrySuspicious(req, endpoint) {
  try {
    await queryRows(
      `INSERT INTO suspicious_activities (user_id, activity_type, severity, risk_score, ip_address, device_fingerprint, details)
       VALUES (?, 'rate_limit_abuse', 'medium', 30, ?, ?, ?)`,
      [
        req.authUser?.id || null,
        req.clientIp || null,
        req.deviceFingerprint || null,
        JSON.stringify({ endpoint, requestId: req.requestId }),
      ]
    );
  } catch {
    /* table may not exist yet */
  }
}

const limiters = {
  login: createEnterpriseLimiter({ name: 'auth_login' }),
  createOrder: createEnterpriseLimiter({ name: 'pay_create' }),
  verify: createEnterpriseLimiter({ name: 'pay_verify' }),
  webhook: createEnterpriseLimiter({ name: 'pay_webhook', logSuspicious: true }),
  riskAnalyze: createEnterpriseLimiter({ name: 'risk_analyze' }),
  admin: createEnterpriseLimiter({ name: 'admin' }),
};

module.exports = { createEnterpriseLimiter, limiters, logRetrySuspicious };
