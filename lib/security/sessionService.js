const crypto = require('crypto');
const { queryRows } = require('../db/safeQuery');
const { logSecurityEvent } = require('./securityAuditService');

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function parseDeviceMeta(req) {
  const signals = req.body?.deviceSignals || {};
  const ua = String(req.userAgent || '');
  return {
    fingerprint: req.deviceFingerprint || signals.fingerprint || null,
    browserName: signals.browser || (ua.includes('Chrome') ? 'Chrome' : ua.includes('Firefox') ? 'Firefox' : 'Browser'),
    osName: signals.os || (ua.includes('Windows') ? 'Windows' : ua.includes('Mac') ? 'macOS' : ua.includes('Android') ? 'Android' : 'OS'),
    deviceLabel: signals.deviceLabel || `${signals.os || 'Device'} · ${signals.browser || 'Browser'}`,
  };
}

async function createSession(req, userId, token, { expiresInSec = 86400, isTrusted = false } = {}) {
  const meta = parseDeviceMeta(req);
  const tokenHash = hashToken(token);
  const expires = new Date(Date.now() + expiresInSec * 1000);
  try {
    await queryRows(
      `INSERT INTO user_sessions
       (user_id, session_token_hash, device_fingerprint, ip_address, user_agent, browser_name, os_name, device_label, is_trusted, is_active, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        userId,
        tokenHash,
        meta.fingerprint,
        req.clientIp || req.ip || null,
        (req.userAgent || '').slice(0, 512),
        meta.browserName,
        meta.osName,
        meta.deviceLabel,
        isTrusted ? 1 : 0,
        expires,
      ]
    );
  } catch {
    /* sessions table optional until migration */
  }
  return { tokenHash, meta };
}

async function touchSession(token) {
  const tokenHash = hashToken(token);
  await queryRows(
    `UPDATE user_sessions SET last_seen_at = NOW() WHERE session_token_hash = ? AND is_active = 1 AND revoked_at IS NULL`,
    [tokenHash]
  ).catch(() => {});
}

async function listSessions(userId, currentToken = null) {
  const currentHash = currentToken ? hashToken(currentToken) : null;
  const rows = await queryRows(
    `SELECT id, device_fingerprint, ip_address, browser_name, os_name, device_label, is_trusted,
            is_active, last_seen_at, expires_at, created_at, revoked_at
     FROM user_sessions WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY last_seen_at DESC LIMIT 50`,
    [userId]
  ).catch(() => []);
  return rows.map((r) => ({
    ...r,
    isCurrent: currentHash && r.id
      ? false
      : false,
    isCurrentSession: currentHash
      ? (async () => {
          const [h] = await queryRows(
            `SELECT session_token_hash FROM user_sessions WHERE id = ?`,
            [r.id]
          ).catch(() => []);
          return h?.session_token_hash === currentHash;
        })()
      : false,
  }));
}

async function listSessionsSync(userId, currentToken) {
  const currentHash = currentToken ? hashToken(currentToken) : null;
  const rows = await queryRows(
    `SELECT id, session_token_hash, device_fingerprint, ip_address, browser_name, os_name, device_label,
            is_trusted, is_active, last_seen_at, expires_at, created_at, revoked_at
     FROM user_sessions WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY last_seen_at DESC LIMIT 50`,
    [userId]
  ).catch(() => []);
  return rows.map((r) => ({
    id: r.id,
    deviceFingerprint: r.device_fingerprint,
    ipAddress: r.ip_address,
    browserName: r.browser_name,
    osName: r.os_name,
    deviceLabel: r.device_label,
    isTrusted: Boolean(r.is_trusted),
    isActive: Boolean(r.is_active) && !r.revoked_at,
    lastSeenAt: r.last_seen_at,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    isCurrent: currentHash === r.session_token_hash,
  }));
}

async function revokeSession(req, userId, sessionId, reason = 'user_revoke') {
  await queryRows(
    `UPDATE user_sessions SET is_active = 0, revoked_at = NOW(), revoke_reason = ?
     WHERE id = ? AND user_id = ?`,
    [reason, sessionId, userId]
  );
  await logSecurityEvent(req, {
    eventType: 'session_revoke',
    userId,
    entityType: 'session',
    entityId: sessionId,
    payload: { reason },
  });
}

async function revokeAllSessions(req, userId, exceptToken = null) {
  const exceptHash = exceptToken ? hashToken(exceptToken) : null;
  if (exceptHash) {
    await queryRows(
      `UPDATE user_sessions SET is_active = 0, revoked_at = NOW(), revoke_reason = 'revoke_all'
       WHERE user_id = ? AND session_token_hash != ? AND deleted_at IS NULL`,
      [userId, exceptHash]
    );
  } else {
    await queryRows(
      `UPDATE user_sessions SET is_active = 0, revoked_at = NOW(), revoke_reason = 'revoke_all'
       WHERE user_id = ? AND deleted_at IS NULL`,
      [userId]
    );
  }
  await logSecurityEvent(req, { eventType: 'session_revoke_all', userId });
}

module.exports = {
  hashToken,
  createSession,
  touchSession,
  listSessionsSync,
  revokeSession,
  revokeAllSessions,
  parseDeviceMeta,
};
