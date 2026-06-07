const { queryRows } = require('../db/safeQuery');

const DEFAULTS = {
  auth_login: {
    windowMs: 15 * 60_000,
    maxIp: 10,
    maxUser: 5,
    maxDevice: 40,
    burstMax: 3,
    burstWindowMs: 10_000,
    cooldownMs: 5 * 60_000,
    enabled: true,
  },
  pay_create: {
    windowMs: 60_000,
    maxIp: 20,
    maxUser: 10,
    maxDevice: 40,
    burstMax: 5,
    burstWindowMs: 10_000,
    cooldownMs: 0,
    enabled: true,
  },
  pay_verify: {
    windowMs: 60_000,
    maxIp: 40,
    maxUser: 20,
    maxDevice: 40,
    burstMax: 8,
    burstWindowMs: 10_000,
    cooldownMs: 0,
    enabled: true,
  },
  pay_webhook: {
    windowMs: 60_000,
    maxIp: 200,
    maxUser: 1000,
    maxDevice: 1000,
    burstMax: 50,
    burstWindowMs: 10_000,
    cooldownMs: 0,
    enabled: true,
  },
  risk_analyze: {
    windowMs: 60_000,
    maxIp: 30,
    maxUser: 15,
    maxDevice: 40,
    burstMax: 6,
    burstWindowMs: 10_000,
    cooldownMs: 0,
    enabled: true,
  },
  admin: {
    windowMs: 60_000,
    maxIp: 60,
    maxUser: 30,
    maxDevice: 40,
    burstMax: 10,
    burstWindowMs: 10_000,
    cooldownMs: 0,
    enabled: true,
  },
  mfa_otp_send: {
    windowMs: 15 * 60_000,
    maxIp: 5,
    maxUser: 3,
    maxDevice: 10,
    burstMax: 2,
    burstWindowMs: 60_000,
    cooldownMs: 60_000,
    enabled: true,
  },
  mfa_otp_verify: {
    windowMs: 15 * 60_000,
    maxIp: 20,
    maxUser: 10,
    maxDevice: 20,
    burstMax: 5,
    burstWindowMs: 60_000,
    cooldownMs: 5 * 60_000,
    enabled: true,
  },
  email_verify_send: {
    windowMs: 60 * 60_000,
    maxIp: 5,
    maxUser: 3,
    maxDevice: 10,
    burstMax: 2,
    burstWindowMs: 60_000,
    cooldownMs: 5 * 60_000,
    enabled: true,
  },
};

const NAME_TO_DEFAULT = {
  auth_login: 'auth_login',
  pay_create: 'pay_create',
  pay_verify: 'pay_verify',
  pay_webhook: 'pay_webhook',
  risk_analyze: 'risk_analyze',
  admin: 'admin',
  mfa_otp_send: 'mfa_otp_send',
  mfa_otp_verify: 'mfa_otp_verify',
  email_verify_send: 'email_verify_send',
};

const cache = new Map();
const CACHE_TTL_MS = parseInt(process.env.RL_SETTINGS_CACHE_MS || '10000', 10);
let tablesChecked = false;
let tablesAvailable = false;

async function checkTables() {
  if (tablesChecked) return tablesAvailable;
  tablesChecked = true;
  try {
    const rows = await queryRows(
      `SELECT 1 AS ok FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rate_limit_settings' LIMIT 1`
    );
    tablesAvailable = rows.length > 0;
  } catch {
    tablesAvailable = false;
  }
  return tablesAvailable;
}

function fromDefaults(name) {
  const d = DEFAULTS[NAME_TO_DEFAULT[name]] || DEFAULTS.auth_login;
  return { ...d };
}

function rowToSettings(row) {
  return {
    windowMs: Number(row.window_ms),
    maxIp: Number(row.max_ip),
    maxUser: Number(row.max_user),
    maxDevice: Number(row.max_device),
    burstMax: Number(row.burst_max),
    burstWindowMs: Number(row.burst_window_ms),
    cooldownMs: Number(row.cooldown_ms),
    enabled: row.enabled === 1 || row.enabled === true,
  };
}

function applyEnvOverrides(name, settings) {
  if (name === 'auth_login') {
    const maxIp = parseInt(process.env.RL_LOGIN_IP || '', 10);
    if (!Number.isNaN(maxIp) && maxIp > 0) settings.maxIp = maxIp;
  }
  if (name === 'pay_create') {
    const maxIp = parseInt(process.env.RL_PAY_CREATE_IP || '', 10);
    const maxUser = parseInt(process.env.RL_PAY_CREATE_USER || '', 10);
    if (!Number.isNaN(maxIp) && maxIp > 0) settings.maxIp = maxIp;
    if (!Number.isNaN(maxUser) && maxUser > 0) settings.maxUser = maxUser;
  }
  if (name === 'pay_webhook') {
    const maxIp = parseInt(process.env.RL_WEBHOOK_IP || '', 10);
    if (!Number.isNaN(maxIp) && maxIp > 0) settings.maxIp = maxIp;
  }
  if (name === 'admin') {
    const maxIp = parseInt(process.env.RL_ADMIN_IP || '', 10);
    if (!Number.isNaN(maxIp) && maxIp > 0) settings.maxIp = maxIp;
  }
  return settings;
}

async function getLimiterSettings(limiterName) {
  const cached = cache.get(limiterName);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.settings;
  }

  let settings = fromDefaults(limiterName);
  if (await checkTables()) {
    try {
      const rows = await queryRows(
        `SELECT window_ms, max_ip, max_user, max_device, burst_max, burst_window_ms, cooldown_ms, enabled
         FROM rate_limit_settings WHERE limiter_name = ? LIMIT 1`,
        [limiterName]
      );
      if (rows.length) settings = rowToSettings(rows[0]);
    } catch {
      /* fall back to defaults */
    }
  }

  settings = applyEnvOverrides(limiterName, settings);
  cache.set(limiterName, { settings, expiresAt: Date.now() + CACHE_TTL_MS });
  return settings;
}

function clearSettingsCache() {
  cache.clear();
  tablesChecked = false;
}

module.exports = { getLimiterSettings, clearSettingsCache, DEFAULTS };
