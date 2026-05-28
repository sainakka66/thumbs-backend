const { queryRows } = require('../../lib/db/safeQuery');
const { recordSecurityIncident } = require('../repositories/securityRepository');
const logger = require('../../lib/logger');

function parseDeviceSignals(req) {
  const ua = String(req.userAgent || '');
  const signals = req.body?.deviceSignals || {};
  return {
    fingerprint: req.deviceFingerprint,
    browserHash: signals.browserHash || null,
    osName: signals.os || (ua.includes('Android') ? 'Android' : ua.includes('iPhone') ? 'iOS' : 'unknown'),
    timezone: signals.timezone || req.headers['x-timezone'] || null,
    language: signals.language || req.headers['accept-language']?.split(',')[0] || null,
    isEmulator: Boolean(signals.isEmulator || /emulator|genymotion/i.test(ua)),
    isHeadless: Boolean(signals.isHeadless || /HeadlessChrome|PhantomJS/i.test(ua)),
    isAutomation: Boolean(signals.isAutomation || /selenium|puppeteer|playwright/i.test(ua)),
  };
}

async function isDeviceBlocked(fingerprint) {
  if (!fingerprint) return false;
  const rows = await queryRows(
    `SELECT id FROM blocked_devices WHERE device_fingerprint = ? AND is_active = 1
     AND (expires_at IS NULL OR expires_at > NOW()) LIMIT 1`,
    [fingerprint]
  ).catch(() => []);
  return rows.length > 0;
}

async function upsertDeviceSession(userId, signals, ip, geo = {}) {
  if (!signals.fingerprint || !userId) return { trustScore: 50 };
  await queryRows(
    `INSERT INTO device_sessions (user_id, device_fingerprint, browser_hash, os_name, timezone, language, ip_address, geo_country, geo_region, is_emulator, is_headless, trust_score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE last_seen_at = NOW(), ip_address = VALUES(ip_address), trust_score = VALUES(trust_score)`,
    [
      userId,
      signals.fingerprint,
      signals.browserHash,
      signals.osName,
      signals.timezone,
      signals.language,
      ip,
      geo.country || null,
      geo.region || null,
      signals.isEmulator ? 1 : 0,
      signals.isHeadless ? 1 : 0,
      50,
    ]
  ).catch(() => {});

  const history = await queryRows(
    `SELECT geo_country, ip_address, last_seen_at FROM device_sessions
     WHERE user_id = ? AND device_fingerprint != ? ORDER BY last_seen_at DESC LIMIT 5`,
    [userId, signals.fingerprint]
  ).catch(() => []);

  let trustScore = 70;
  const flags = [];

  if (signals.isEmulator) {
    trustScore -= 30;
    flags.push('emulator');
  }
  if (signals.isHeadless || signals.isAutomation) {
    trustScore -= 40;
    flags.push('automation');
  }

  if (history.length >= 2) {
    const countries = new Set(history.map((h) => h.geo_country).filter(Boolean));
    if (countries.size >= 3) {
      trustScore -= 25;
      flags.push('impossible_travel');
      await recordSecurityIncident({
        incidentType: 'impossible_travel',
        severity: 'high',
        userId,
        details: { countries: [...countries], fingerprint: signals.fingerprint },
        ipAddress: ip,
      });
    }
  }

  if (await isDeviceBlocked(signals.fingerprint)) {
    trustScore = 0;
    flags.push('blocked_device');
  }

  return { trustScore: Math.max(0, trustScore), flags };
}

async function evaluateDeviceTrust(req) {
  const signals = parseDeviceSignals(req);
  const result = await upsertDeviceSession(req.authUser?.id, signals, req.clientIp);
  if (result.trustScore < 30) {
    logger.warn({ userId: req.authUser?.id, flags: result.flags }, 'low_device_trust');
  }
  return result;
}

module.exports = {
  parseDeviceSignals,
  isDeviceBlocked,
  upsertDeviceSession,
  evaluateDeviceTrust,
};
