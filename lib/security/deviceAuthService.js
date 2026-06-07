const { queryRows } = require('../db/safeQuery');
const { logSecurityEvent } = require('./securityAuditService');
const { sendEmailOtp, verifyEmailOtp } = require('./mfaService');
const { parseDeviceMeta } = require('./sessionService');

async function getTrustedDevice(userId, fingerprint) {
  if (!fingerprint) return null;
  const rows = await queryRows(
    `SELECT id, is_verified, label, browser_name, os_name, last_ip AS ip_address, trusted_at, updated_at
     FROM trusted_devices WHERE user_id = ? AND device_fingerprint = ? AND deleted_at IS NULL LIMIT 1`,
    [userId, fingerprint]
  ).catch(() => []);
  return rows[0] || null;
}

async function listDevices(userId) {
  return queryRows(
    `SELECT id, device_fingerprint, label AS device_label, browser_name, os_name, last_ip AS ip_address,
            is_verified, verified_at, updated_at AS last_login_at, created_at
     FROM trusted_devices WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY updated_at DESC`,
    [userId]
  ).catch(() => []);
}

async function registerOrUpdateDevice(req, userId, { trusted = false } = {}) {
  const meta = parseDeviceMeta(req);
  if (!meta.fingerprint) return { needsVerification: false, device: null };

  const existing = await getTrustedDevice(userId, meta.fingerprint);
  if (existing?.is_verified) {
    await queryRows(`UPDATE trusted_devices SET last_ip = ?, updated_at = NOW() WHERE id = ?`, [
      req.clientIp || null,
      existing.id,
    ]).catch(() => {});
    return { needsVerification: false, device: existing };
  }

  await queryRows(
    `INSERT INTO trusted_devices (user_id, device_fingerprint, label, browser_name, os_name, last_ip, is_verified, verified_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       label = VALUES(label),
       browser_name = VALUES(browser_name),
       os_name = VALUES(os_name),
       last_ip = VALUES(last_ip),
       updated_at = NOW()`,
    [
      userId,
      meta.fingerprint,
      meta.deviceLabel,
      meta.browserName,
      meta.osName,
      req.clientIp || null,
      trusted ? 1 : 0,
      trusted ? new Date() : null,
    ]
  ).catch(() => {});

  if (!existing?.is_verified && !trusted) {
    await logSecurityEvent(req, {
      eventType: 'device_new_detected',
      userId,
      payload: { fingerprint: meta.fingerprint, browser: meta.browserName, os: meta.osName },
    });
    return { needsVerification: true, device: meta };
  }

  return { needsVerification: false, device: meta };
}

async function trustDevice(req, userId, deviceId) {
  await queryRows(
    `UPDATE trusted_devices SET is_verified = 1, verified_at = NOW() WHERE id = ? AND user_id = ?`,
    [deviceId, userId]
  );
  await logSecurityEvent(req, {
    eventType: 'device_trusted',
    userId,
    entityType: 'device',
    entityId: deviceId,
  });
}

async function sendDeviceVerificationOtp(req, userId) {
  return sendEmailOtp(req, userId, 'device_verify');
}

async function markDeviceVerified(req, userId) {
  const meta = parseDeviceMeta(req);
  if (meta.fingerprint) {
    await queryRows(
      `UPDATE trusted_devices SET is_verified = 1, verified_at = NOW(), updated_at = NOW()
       WHERE user_id = ? AND device_fingerprint = ?`,
      [userId, meta.fingerprint]
    ).catch(() => {});
  }
  await logSecurityEvent(req, { eventType: 'device_verify', userId, payload: { fingerprint: meta.fingerprint } });
  return true;
}

async function verifyDevice(req, userId, otp) {
  let ok = await verifyEmailOtp(req, userId, otp, 'device_verify');
  if (!ok) ok = await verifyEmailOtp(req, userId, otp, 'mfa_login');
  if (!ok) return false;
  await markDeviceVerified(req, userId);
  return true;
}

module.exports = {
  getTrustedDevice,
  listDevices,
  registerOrUpdateDevice,
  trustDevice,
  sendDeviceVerificationOtp,
  verifyDevice,
  markDeviceVerified,
};
