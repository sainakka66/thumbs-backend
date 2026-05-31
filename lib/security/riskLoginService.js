const { queryRows } = require('../db/safeQuery');
const { recordSecurityIncident } = require('../../payments/repositories/securityRepository');
const logger = require('../logger');

const TOR_EXIT_IPS = new Set(); /* populated via optional TOR list feed */

function isPrivateIp(ip) {
  if (!ip) return true;
  return (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('127.') ||
    ip.startsWith('172.16.') ||
    ip === '::1'
  );
}

function detectVpnProxy(req) {
  const h = req.headers || {};
  const flags = [];
  if (h['x-vpn'] || h['via']?.includes('VPN')) flags.push('vpn_header');
  if (h['x-forwarded-for']?.split(',').length > 3) flags.push('proxy_chain');
  return flags;
}

async function getRecentLoginLocations(userId, fingerprint) {
  return queryRows(
    `SELECT ip_address, geo_country, last_seen_at FROM device_sessions
     WHERE user_id = ? AND device_fingerprint != ? ORDER BY last_seen_at DESC LIMIT 5`,
    [userId, fingerprint || '']
  ).catch(() => []);
}

async function scoreLoginRisk(req, { userId, username }) {
  let score = 0;
  const factors = [];
  const ip = req.clientIp || req.ip;
  const fp = req.deviceFingerprint;

  if (detectVpnProxy(req).length) {
    score += 20;
    factors.push('vpn_proxy_headers');
  }

  if (ip && TOR_EXIT_IPS.has(ip)) {
    score += 50;
    factors.push('tor_exit');
  }

  const failures = await queryRows(
    `SELECT COUNT(*) AS cnt FROM login_attempts
     WHERE username = ? AND success = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
    [username]
  ).catch(() => [{ cnt: 0 }]);
  const failCnt = Number(failures[0]?.cnt || 0);
  if (failCnt >= 3) {
    score += 15 * Math.min(failCnt, 5);
    factors.push('recent_failures');
  }

  if (userId && fp) {
    const history = await getRecentLoginLocations(userId, fp);
    const countries = new Set(history.map((h) => h.geo_country).filter(Boolean));
    if (countries.size >= 2) {
      score += 35;
      factors.push('impossible_travel');
      await recordSecurityIncident({
        incidentType: 'impossible_travel_login',
        severity: 'high',
        userId,
        details: { countries: [...countries], ip },
        ipAddress: ip,
      }).catch(() => {});
    }
  }

  const ua = String(req.userAgent || '');
  if (/HeadlessChrome|PhantomJS|selenium|playwright/i.test(ua)) {
    score += 40;
    factors.push('automation_ua');
  }

  if (score >= 60) {
    logger.warn({ userId, username, score, factors }, 'suspicious_login');
  }

  return {
    riskScore: Math.min(100, score),
    riskLevel: score >= 75 ? 'HIGH' : score >= 50 ? 'MEDIUM' : score >= 25 ? 'LOW' : 'MINIMAL',
    factors,
    suspicious: score >= 60,
  };
}

module.exports = {
  scoreLoginRisk,
  detectVpnProxy,
  isPrivateIp,
};
