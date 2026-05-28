const { getRateLimitStore } = require('./memoryStore');
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

function createEnterpriseLimiter({
  name,
  windowMs = 60_000,
  maxIp = 60,
  maxUser = 30,
  maxDevice = 40,
  burstMax = 15,
  burstWindowMs = 10_000,
  cooldownMs = 0,
  logSuspicious = true,
}) {
  const store = getRateLimitStore();

  return async function enterpriseLimiter(req, res, next) {
    try {
      const keys = buildKeys(req, name);

      if (store.isCoolingDown(keys.ip)) {
        return res.status(429).json({ success: false, message: 'Cooldown active. Try again later.', code: 'RATE_COOLDOWN' });
      }

      const burst = store.increment(keys.burst, burstWindowMs);
      const ipCount = store.increment(keys.ip, windowMs);
      const userCount = store.increment(keys.user, windowMs);
      const deviceCount = store.increment(keys.device, windowMs);

      const exceeded =
        burst > burstMax || ipCount > maxIp || userCount > maxUser || deviceCount > maxDevice;

      if (exceeded) {
        if (cooldownMs > 0) store.setCooldown(keys.ip, Date.now() + cooldownMs);
        if (logSuspicious) {
          logger.warn({ name, ip: req.clientIp, userId: req.authUser?.id, burst, ipCount, userCount }, 'rate_limit_exceeded');
          logRetrySuspicious(req, name).catch(() => {});
        }
        res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)));
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
  login: createEnterpriseLimiter({
    name: 'auth_login',
    windowMs: 15 * 60_000,
    maxIp: parseInt(process.env.RL_LOGIN_IP || '10', 10),
    maxUser: 5,
    burstMax: 3,
    cooldownMs: 5 * 60_000,
  }),
  createOrder: createEnterpriseLimiter({
    name: 'pay_create',
    windowMs: 60_000,
    maxIp: parseInt(process.env.RL_PAY_CREATE_IP || '20', 10),
    maxUser: parseInt(process.env.RL_PAY_CREATE_USER || '10', 10),
    burstMax: 5,
  }),
  verify: createEnterpriseLimiter({
    name: 'pay_verify',
    windowMs: 60_000,
    maxIp: 40,
    maxUser: 20,
    burstMax: 8,
  }),
  webhook: createEnterpriseLimiter({
    name: 'pay_webhook',
    windowMs: 60_000,
    maxIp: parseInt(process.env.RL_WEBHOOK_IP || '200', 10),
    maxUser: 1000,
    maxDevice: 1000,
    burstMax: 50,
    logSuspicious: true,
  }),
  riskAnalyze: createEnterpriseLimiter({
    name: 'risk_analyze',
    windowMs: 60_000,
    maxIp: 30,
    maxUser: 15,
    burstMax: 6,
  }),
  admin: createEnterpriseLimiter({
    name: 'admin',
    windowMs: 60_000,
    maxIp: parseInt(process.env.RL_ADMIN_IP || '60', 10),
    maxUser: 30,
    burstMax: 10,
  }),
};

module.exports = { createEnterpriseLimiter, limiters, logRetrySuspicious };
