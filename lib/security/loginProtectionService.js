const { queryRows } = require('../db/safeQuery');
const { logSecurityEvent } = require('./securityAuditService');

const MAX_FAILURES = parseInt(process.env.LOGIN_MAX_FAILURES || '5', 10);
const LOCKOUT_MINUTES = parseInt(process.env.LOGIN_LOCKOUT_MINUTES || '15', 10);
const WINDOW_MINUTES = parseInt(process.env.LOGIN_FAILURE_WINDOW_MIN || '30', 10);

async function recordLoginAttempt(req, { username, userId = null, success, failureReason = null, riskScore = null }) {
  try {
    await queryRows(
      `INSERT INTO login_attempts (username, user_id, ip_address, device_fingerprint, user_agent, success, failure_reason, risk_score)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        userId,
        req?.clientIp || req?.ip || null,
        req?.deviceFingerprint || null,
        (req?.userAgent || '').slice(0, 512) || null,
        success ? 1 : 0,
        failureReason,
        riskScore,
      ]
    );
  } catch {
    /* table may not exist yet */
  }

  if (!success) {
    await logSecurityEvent(req, {
      eventType: 'login_failed',
      userId,
      username,
      payload: { failureReason, riskScore },
    });
  }
}

async function getRecentFailures(username) {
  try {
    const rows = await queryRows(
      `SELECT COUNT(*) AS cnt FROM login_attempts
       WHERE username = ? AND success = 0
         AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)`,
      [username, WINDOW_MINUTES]
    );
    return Number(rows[0]?.cnt || 0);
  } catch {
    return 0;
  }
}

async function isAccountLocked(username) {
  try {
    const rows = await queryRows(
      `SELECT locked_until, reason FROM account_lockouts
       WHERE username = ? AND locked_until > NOW()
       ORDER BY locked_until DESC LIMIT 1`,
      [username]
    );
    if (!rows.length) return null;
    return { until: rows[0].locked_until, reason: rows[0].reason };
  } catch {
    return null;
  }
}

async function applyLockout(req, { username, userId = null, reason = 'brute_force' }) {
  const until = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
  try {
    await queryRows(
      `INSERT INTO account_lockouts (user_id, username, locked_until, reason) VALUES (?, ?, ?, ?)`,
      [userId, username, until, reason]
    );
  } catch {
    /* ignore */
  }
  await logSecurityEvent(req, {
    eventType: 'login_locked',
    userId,
    username,
    payload: { reason, lockedUntil: until.toISOString() },
  });
  return until;
}

async function checkAndMaybeLock(req, { username, userId = null }) {
  const failures = await getRecentFailures(username);
  if (failures >= MAX_FAILURES) {
    const until = await applyLockout(req, { username, userId });
    return { locked: true, until, failures };
  }
  return { locked: false, failures };
}

async function clearFailuresOnSuccess(username) {
  /* keep history; lockouts expire naturally */
}

module.exports = {
  recordLoginAttempt,
  getRecentFailures,
  isAccountLocked,
  checkAndMaybeLock,
  clearFailuresOnSuccess,
  MAX_FAILURES,
  LOCKOUT_MINUTES,
};
