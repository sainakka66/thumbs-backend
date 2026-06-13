const jwt = require('jsonwebtoken');
const { getJwtSecret, getJwtExpiresIn, getRazorpayReviewUsernames } = require('../../config');
const { loadPermissionsForUser } = require('../rbac/permissionCache');
const { writeAudit } = require('../audit/auditService');
const { logSecurityEvent } = require('./securityAuditService');
const loginProtection = require('./loginProtectionService');
const mfaService = require('./mfaService');
const deviceAuthService = require('./deviceAuthService');
const sessionService = require('./sessionService');
const { createPendingChallenge, verifyPendingChallenge } = require('./authChallengeService');
const { scoreLoginRisk } = require('./riskLoginService');
const { maskEmail } = require('../email/emailService');

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

async function completeLoginSuccess(req, res, user, { emailAlreadyVerified = false, emailMasked = null, riskScore = 0 } = {}) {
  const { token, role, permissions } = await issueFullToken(user);
  await sessionService.createSession(req, user.id, token, { isTrusted: true });
  await logSecurityEvent(req, {
    eventType: 'login',
    userId: user.id,
    username: user.username,
    payload: { riskScore, emailAlreadyVerified },
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
    riskScore,
    emailAlreadyVerified,
    emailMasked,
  });
}

async function finalizeLogin(req, res, user, { skipDeviceCheck = false } = {}) {
  if (getRazorpayReviewUsernames().has(String(user.username || '').toLowerCase())) {
    return completeLoginSuccess(req, res, user, { emailAlreadyVerified: true, riskScore: 0 });
  }

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

  const profile = await mfaService.getUserForOtp(user.id);
  const emailVerified = Boolean(profile?.email_verified);
  const emailMasked = maskEmail(profile?.email);

  let deviceResult = { needsVerification: false };
  if (!skipDeviceCheck) {
    deviceResult = await deviceAuthService.registerOrUpdateDevice(req, user.id);
  }

  // New or unverified email — one-time OTP verification (no repeat on later logins)
  if (profile?.email && !emailVerified) {
    const send = await mfaService.sendEmailOwnershipOtp(req, user.id);
    if (!send.sent) {
      return res.status(403).json({
        success: false,
        message: send.message || 'Unable to send email verification code.',
        code: send.code,
      });
    }
    const pendingToken = createPendingChallenge(
      {
        userId: user.id,
        username: user.username,
        role: user.role,
        purposes: ['email_verify'],
        deviceFingerprint: req.deviceFingerprint,
      },
      getSecret()
    );
    return res.json({
      success: true,
      challengeRequired: true,
      emailVerificationRequired: true,
      pendingToken,
      emailMasked: send.emailMasked,
      riskScore: risk.riskScore,
      message: 'New email detected. Enter the one-time code sent to your inbox.',
    });
  }

  // Verified email — skip repeat OTP emails; trust device silently
  if (emailVerified && deviceResult.needsVerification) {
    await deviceAuthService.markDeviceVerified(req, user.id);
    deviceResult.needsVerification = false;
  }

  const mfa = await mfaService.isMfaRequired(user.id);
  let needsMfa = mfa.required;
  let mfaMethods = [...(mfa.methods || [])];

  if (emailVerified) {
    mfaMethods = mfaMethods.filter((m) => m !== 'email');
    if (!mfaMethods.length) needsMfa = false;
  }

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

    let challengeEmailMasked = null;
    const sendMfaEmail = needsMfa && mfaMethods.includes('email');
    const dualEmailChallenge = needsDevice && sendMfaEmail;

    if (dualEmailChallenge) {
      const send = await mfaService.sendEmailOtp(req, user.id, 'login_challenge');
      if (!send.sent) {
        return res.status(403).json({
          success: false,
          message: send.message || 'Unable to send verification email.',
          code: send.code,
        });
      }
      challengeEmailMasked = send.emailMasked;
    } else if (needsDevice) {
      const deviceSend = await deviceAuthService.sendDeviceVerificationOtp(req, user.id);
      if (!deviceSend.sent) {
        return res.status(403).json({
          success: false,
          message: deviceSend.message || 'Unable to send device verification email.',
          code: deviceSend.code,
        });
      }
      challengeEmailMasked = deviceSend.emailMasked;
    } else if (sendMfaEmail) {
      const mfaSend = await mfaService.sendEmailOtp(req, user.id, 'mfa_login');
      if (!mfaSend.sent) {
        return res.status(403).json({
          success: false,
          message: mfaSend.message || 'Unable to send MFA email.',
          code: mfaSend.code,
        });
      }
      challengeEmailMasked = mfaSend.emailMasked;
    }

    const defaultMethod = needsDevice ? 'device' : mfaMethods[0] || 'email';

    return res.json({
      success: true,
      challengeRequired: true,
      pendingToken,
      mfaRequired: needsMfa,
      mfaMethods,
      deviceVerificationRequired: needsDevice,
      defaultMethod,
      emailMasked: challengeEmailMasked,
      riskScore: risk.riskScore,
      message: needsDevice
        ? 'New device detected. Check your verified email for the verification code.'
        : 'Additional verification required.',
    });
  }

  return completeLoginSuccess(req, res, user, {
    emailAlreadyVerified: emailVerified,
    emailMasked,
    riskScore: risk.riskScore,
  });
}

async function resendChallengeOtp(req, { pendingToken, purpose }) {
  const decoded = verifyPendingChallenge(pendingToken, getSecret());
  if (!decoded?.userId) {
    return { success: false, message: 'Invalid or expired challenge' };
  }

  if (decoded.purposes?.includes('email_verify')) {
    req.authUser = { id: decoded.userId };
    const result = await mfaService.sendEmailOwnershipOtp(req, decoded.userId);
    if (!result.sent) {
      return { success: false, message: result.message, code: result.code };
    }
    return {
      success: true,
      message: result.message,
      emailMasked: result.emailMasked,
      purpose: 'email_verify_login',
    };
  }

  const dualChallenge = decoded.purposes?.includes('device') && decoded.purposes?.includes('mfa');
  const otpPurpose = dualChallenge
    ? 'login_challenge'
    : purpose === 'device_verify' || decoded.purposes?.includes('device')
      ? 'device_verify'
      : 'mfa_login';

  if (!dualChallenge && otpPurpose === 'device_verify' && !decoded.purposes?.includes('device')) {
    return { success: false, message: 'Device verification is not required for this challenge.' };
  }
  if (!dualChallenge && otpPurpose === 'mfa_login' && !decoded.purposes?.includes('mfa')) {
    return { success: false, message: 'MFA is not required for this challenge.' };
  }

  req.authUser = { id: decoded.userId };
  const result = await mfaService.sendEmailOtp(req, decoded.userId, otpPurpose);
  if (!result.sent) {
    return { success: false, message: result.message, code: result.code };
  }
  return {
    success: true,
    message: result.message,
    emailMasked: result.emailMasked,
    purpose: otpPurpose,
  };
}

async function completeAuthChallenge(req, { pendingToken, code, method }) {
  const decoded = verifyPendingChallenge(pendingToken, getSecret());
  if (!decoded?.userId) {
    return { success: false, message: 'Invalid or expired challenge' };
  }

  req.clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  req.deviceFingerprint = req.headers['x-device-fingerprint'] || null;
  req.userAgent = req.headers['user-agent'];
  req.authUser = { id: decoded.userId };

  const purposes = decoded.purposes || [];

  if (purposes.includes('email_verify')) {
    const ok = await mfaService.verifyAndMarkEmailVerified(req, decoded.userId, code, 'email_verify_login');
    if (!ok) return { success: false, message: 'Invalid verification code' };
    if (decoded.deviceFingerprint) {
      await deviceAuthService.markDeviceVerified(req, decoded.userId);
    }
    const user = {
      id: decoded.userId,
      username: decoded.username,
      role: decoded.role,
    };
    const { token, role, permissions } = await issueFullToken(user);
    await sessionService.createSession(req, user.id, token, { isTrusted: true });
    await logSecurityEvent(req, { eventType: 'login', userId: user.id, username: user.username });
    const profile = await mfaService.getUserForOtp(user.id);
    return {
      success: true,
      token,
      role,
      permissions,
      emailJustVerified: true,
      emailMasked: maskEmail(profile?.email),
    };
  }

  const resolvedMethod = method || (purposes.includes('device') ? 'device' : 'email');
  const dualChallenge = purposes.includes('device') && purposes.includes('mfa');

  if (dualChallenge && ['device', 'email'].includes(resolvedMethod)) {
    const ok = await mfaService.verifyEmailOtp(req, decoded.userId, code, 'login_challenge');
    if (!ok) return { success: false, message: 'Invalid verification code' };
    await deviceAuthService.markDeviceVerified(req, decoded.userId);
    await logSecurityEvent(req, {
      eventType: 'mfa_verify',
      userId: decoded.userId,
      payload: { method: 'email', dualChallenge: true },
    });
  } else if (purposes.includes('device') && resolvedMethod === 'device') {
    const ok = await deviceAuthService.verifyDevice(req, decoded.userId, code);
    if (!ok) return { success: false, message: 'Invalid device verification code' };
  } else if (purposes.includes('mfa') && ['totp', 'email', 'backup'].includes(resolvedMethod)) {
    const ok = await mfaService.verifyMfaChallenge(req, decoded.userId, {
      method: resolvedMethod,
      code,
    });
    if (!ok) return { success: false, message: 'Invalid MFA code' };
    await logSecurityEvent(req, {
      eventType: 'mfa_verify',
      userId: decoded.userId,
      payload: { method: resolvedMethod },
    });
  } else if (purposes.includes('device') && resolvedMethod === 'email') {
    const ok = await deviceAuthService.verifyDevice(req, decoded.userId, code);
    if (!ok) return { success: false, message: 'Invalid device verification code' };
  } else if (purposes.includes('mfa')) {
    const ok = await mfaService.verifyMfaChallenge(req, decoded.userId, {
      method: resolvedMethod,
      code,
    });
    if (!ok) return { success: false, message: 'Invalid MFA code' };
  } else {
    return { success: false, message: 'Invalid verification method' };
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

module.exports = { finalizeLogin, completeAuthChallenge, resendChallengeOtp, issueFullToken };
