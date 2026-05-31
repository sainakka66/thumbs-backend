const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { getJwtSecret, getJwtExpiresIn } = require('../../config');
const { loadPermissionsForUser } = require('../rbac/permissionCache');
const { writeAudit } = require('../audit/auditService');
const { logSecurityEvent } = require('./securityAuditService');
const loginProtection = require('./loginProtectionService');
const mfaService = require('./mfaService');
const deviceAuthService = require('./deviceAuthService');
const sessionService = require('./sessionService');
const { createPendingChallenge, verifyPendingChallenge } = require('./authChallengeService');
const { scoreLoginRisk } = require('./riskLoginService');

function getSecret() {
  return getJwtSecret();
}

async function issueFullToken(user) {
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role || 'user' },
    getSecret(),
    { expiresIn: getJwtExpiresIn() }
  );
  const { roleSlug, permissions } = await loadPermissionsForUser(user);
  return { token, role: roleSlug, permissions: [...permissions] };
}

async function finalizeLogin(req, res, user, { skipDeviceCheck = false } = {}) {
  const risk = await scoreLoginRisk(req, { userId: user.id, username: user.username });
  await loginProtection.recordLoginAttempt(req, {
    username: user.username,
    userId: user.id,
    success: true,
    riskScore: risk.riskScore,
  });
  await loginProtection.clearFailuresOnSuccess(user.username);

  if (risk.suspicious) {
    await logSecurityEvent(req, {
      eventType: 'suspicious_login',
      userId: user.id,
      username: user.username,
      payload: { riskScore: risk.riskScore, factors: risk.factors },
    });
  }

  let deviceResult = { needsVerification: false };
  if (!skipDeviceCheck) {
    deviceResult = await deviceAuthService.registerOrUpdateDevice(req, user.id);
  }

  const mfa = await mfaService.isMfaRequired(user.id);
  const needsMfa = mfa.required;
  const needsDevice = deviceResult.needsVerification;

  if (needsMfa || needsDevice) {
    const purposes = [];
    if (needsMfa) purposes.push('mfa');
    if (needsDevice) purposes.push('device');
    const pendingToken = createPendingChallenge(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        purposes,
        deviceFingerprint: req.deviceFingerprint,
      },
      getSecret()
    );
    if (needsDevice) {
      await deviceAuthService.sendDeviceVerificationOtp(req, user.id);
    }
    if (needsMfa && mfa.methods.includes('email')) {
      await mfaService.sendEmailOtp(req, user.id, 'mfa_login');
    }
    return res.json({
      success: true,
      challengeRequired: true,
      pendingToken,
      mfaRequired: needsMfa,
      mfaMethods: mfa.methods,
      deviceVerificationRequired: needsDevice,
      riskScore: risk.riskScore,
      message: needsDevice
        ? 'New device detected. Verify via email OTP.'
        : 'Multi-factor authentication required.',
    });
  }

  const { token, role, permissions } = await issueFullToken(user);
  await sessionService.createSession(req, user.id, token, { isTrusted: true });
  await logSecurityEvent(req, {
    eventType: 'login',
    userId: user.id,
    username: user.username,
    payload: { riskScore: risk.riskScore },
  });
  writeAudit(
    { user: { id: user.id, username: user.username }, businessUser: user, clientIp: req.ip },
    { action: 'login', entityType: 'user', entityId: user.id, afterValue: { username: user.username } }
  ).catch(() => {});

  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    success: true,
    token,
    role,
    permissions,
    riskScore: risk.riskScore,
  });
}

async function completeAuthChallenge(req, { pendingToken, code, method }) {
  const decoded = verifyPendingChallenge(pendingToken, getSecret());
  if (!decoded?.userId) {
    return { success: false, message: 'Invalid or expired challenge' };
  }

  req.clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  req.deviceFingerprint = req.headers['x-device-fingerprint'] || null;
  req.userAgent = req.headers['user-agent'];

  const purposes = decoded.purposes || [];

  if (method === 'device' || purposes.includes('device')) {
    const ok = await deviceAuthService.verifyDevice(decoded.userId, code);
    if (!ok && method !== 'totp' && method !== 'email' && method !== 'backup') {
      return { success: false, message: 'Invalid device verification code' };
    }
  }

  if (purposes.includes('mfa') && ['totp', 'email', 'backup'].includes(method)) {
    const ok = await mfaService.verifyMfaChallenge(req, decoded.userId, { method, code });
    if (!ok) return { success: false, message: 'Invalid MFA code' };
    await logSecurityEvent(req, { eventType: 'mfa_verify', userId: decoded.userId, payload: { method } });
  } else if (purposes.includes('mfa') && method === 'device') {
    /* device-only path */
  } else if (purposes.includes('mfa')) {
    const ok = await mfaService.verifyMfaChallenge(req, decoded.userId, { method: method || 'email', code });
    if (!ok) return { success: false, message: 'Invalid MFA code' };
  }

  const user = {
    id: decoded.userId,
    username: decoded.username,
    role: decoded.role,
  };
  const { token, role, permissions } = await issueFullToken(user);
  await sessionService.createSession(req, user.id, token, { isTrusted: true });
  await logSecurityEvent(req, { eventType: 'login', userId: user.id, username: user.username });

  return {
    success: true,
    token,
    role,
    permissions,
  };
}

module.exports = { finalizeLogin, completeAuthChallenge, issueFullToken };
