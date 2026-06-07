const express = require('express');
const { protect } = require('../../lib/rbac/protect');
const mfaService = require('../../lib/security/mfaService');
const emailVerificationService = require('../../lib/security/emailVerificationService');
const sessionService = require('../../lib/security/sessionService');
const deviceAuthService = require('../../lib/security/deviceAuthService');
const { logSecurityEvent } = require('../../lib/security/securityAuditService');
const { queryRows } = require('../../lib/db/safeQuery');
const { limiters } = require('../../lib/rateLimit/enterpriseLimiter');

function parsePayload(p) {
  if (!p) return null;
  if (typeof p === 'object') return p;
  try {
    return JSON.parse(p);
  } catch {
    return p;
  }
}

function createSecurityRoutes({ verifyToken, completeAuthChallenge }) {
  const router = express.Router();
  const mfaOtpSendLimiter = limiters.mfaOtpSend;
  const emailVerifySendLimiter = limiters.emailVerifySend;

  router.get(
    '/mfa/status',
    ...protect(verifyToken, 'security.view', async (req, res) => {
      const mfa = await mfaService.isMfaRequired(req.businessUser.id);
      const settings = await mfaService.getMfaSettings(req.businessUser.id);
      const emailStatus = await emailVerificationService.getEmailStatus(req.businessUser.id);
      res.json({
        success: true,
        mfaRequired: mfa.required,
        methods: mfa.methods,
        totpEnabled: Boolean(settings?.totp_enabled),
        emailOtpEnabled: Boolean(settings?.email_otp_enabled),
        backupCodesGenerated: Boolean(settings?.backup_codes_generated),
        emailVerified: emailStatus.emailVerified,
        emailMasked: emailStatus.emailMasked,
        hasEmail: emailStatus.hasEmail,
      });
    })
  );

  router.get(
    '/email/status',
    ...protect(verifyToken, 'security.view', async (req, res) => {
      const status = await emailVerificationService.getEmailStatus(req.businessUser.id);
      res.json({ success: true, ...status });
    })
  );

  router.post(
    '/email/send-verification',
    ...protect(
      verifyToken,
      'security.manage',
      (req, res, next) => {
        req.authUser = { id: req.businessUser.id };
        return emailVerifySendLimiter(req, res, next);
      },
      async (req, res) => {
      const result = await emailVerificationService.sendVerificationEmail(req, req.businessUser.id);
      if (!result.sent) {
        const status = result.alreadyVerified ? 200 : 400;
        return res.status(status).json({ success: result.alreadyVerified || false, ...result });
      }
      res.json({ success: true, message: result.message, emailMasked: result.emailMasked });
    }
    )
  );

  router.post(
    '/mfa/totp/setup',
    ...protect(verifyToken, 'security.manage', async (req, res) => {
      const { secret, otpauthUrl } = await mfaService.setupTotp(
        req.businessUser.id,
        req.businessUser.username
      );
      res.json({
        success: true,
        otpauthUrl,
        secret: process.env.NODE_ENV !== 'production' ? secret : undefined,
      });
    })
  );

  router.post(
    '/mfa/totp/verify',
    ...protect(verifyToken, 'security.manage', async (req, res) => {
      const result = await mfaService.verifyAndEnableTotp(req, req.businessUser.id, req.body?.code);
      if (!result.ok) return res.status(400).json({ success: false, message: result.message });
      const backupCodes = await mfaService.regenerateBackupCodes(req, req.businessUser.id);
      res.json({
        success: true,
        backupCodes,
        message: 'Authenticator enabled. Save your backup codes.',
      });
    })
  );

  router.post(
    '/mfa/email/enable',
    ...protect(verifyToken, 'security.manage', async (req, res) => {
      const result = await mfaService.enableEmailOtp(req, req.businessUser.id);
      if (!result.ok) return res.status(403).json({ success: false, message: result.message, code: result.code });
      res.json({ success: true, message: 'Email MFA enabled.' });
    })
  );

  router.post(
    '/mfa/email/send',
    ...protect(
      verifyToken,
      'security.manage',
      (req, res, next) => {
        req.authUser = { id: req.businessUser.id };
        return mfaOtpSendLimiter(req, res, next);
      },
      async (req, res) => {
      const out = await mfaService.sendEmailOtp(req, req.businessUser.id, req.body?.purpose || 'mfa_login');
      if (!out.sent) return res.status(403).json({ success: false, message: out.message, code: out.code });
      res.json({ success: true, message: out.message, emailMasked: out.emailMasked });
    }
    )
  );

  router.post(
    '/mfa/backup/regenerate',
    ...protect(verifyToken, 'security.manage', async (req, res) => {
      const codes = await mfaService.regenerateBackupCodes(req, req.businessUser.id);
      res.json({
        success: true,
        backupCodes: codes,
        message: 'Store these codes securely. They are shown once.',
      });
    })
  );

  router.post('/mfa/challenge/verify', async (req, res) => {
    try {
      const { pendingToken, code, method } = req.body || {};
      if (!pendingToken || !code || !method) {
        return res.status(400).json({ success: false, message: 'pendingToken, code, and method required' });
      }
      const result = await completeAuthChallenge(req, { pendingToken, code, method });
      if (!result.success) return res.status(401).json(result);
      res.json(result);
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.get(
    '/sessions',
    ...protect(verifyToken, 'security.view', async (req, res) => {
      const token = (req.headers.authorization || '').split(' ')[1];
      const sessions = await sessionService.listSessionsSync(req.businessUser.id, token);
      res.json({ success: true, sessions });
    })
  );

  router.delete(
    '/sessions/:id',
    ...protect(verifyToken, 'security.manage', async (req, res) => {
      await sessionService.revokeSession(req, req.businessUser.id, req.params.id);
      res.json({ success: true });
    })
  );

  router.post(
    '/sessions/revoke-all',
    ...protect(verifyToken, 'security.manage', async (req, res) => {
      const token = (req.headers.authorization || '').split(' ')[1];
      await sessionService.revokeAllSessions(req, req.businessUser.id, token);
      res.json({ success: true });
    })
  );

  router.get(
    '/devices',
    ...protect(verifyToken, 'security.view', async (req, res) => {
      const devices = await deviceAuthService.listDevices(req.businessUser.id);
      res.json({ success: true, devices });
    })
  );

  router.post(
    '/devices/:id/trust',
    ...protect(verifyToken, 'security.manage', async (req, res) => {
      await deviceAuthService.trustDevice(req, req.businessUser.id, req.params.id);
      res.json({ success: true });
    })
  );

  router.post('/devices/verify', async (req, res) => {
    try {
      const { pendingToken, code } = req.body || {};
      if (!pendingToken || !code) {
        return res.status(400).json({ success: false, message: 'pendingToken and code required' });
      }
      const result = await completeAuthChallenge(req, { pendingToken, code, method: 'device' });
      if (!result.success) return res.status(401).json(result);
      res.json(result);
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  });

  router.get(
    '/audit/events',
    ...protect(verifyToken, 'security.admin', async (req, res) => {
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
      const offset = (page - 1) * limit;
      const eventType = req.query.eventType || null;
      let where = '1=1';
      const params = [];
      if (eventType) {
        where += ' AND event_type = ?';
        params.push(eventType);
      }
      const countRows = await queryRows(
        `SELECT COUNT(*) AS total FROM security_audit_events WHERE ${where}`,
        params
      ).catch(() => [{ total: 0 }]);
      const rows = await queryRows(
        `SELECT id, event_type, user_id, username, entity_type, entity_id, payload, ip_address, device_fingerprint, created_at
         FROM security_audit_events WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ).catch(() => []);
      res.json({
        success: true,
        total: countRows[0]?.total || 0,
        page,
        events: rows.map((r) => ({ ...r, payload: parsePayload(r.payload) })),
      });
    })
  );

  router.post(
    '/admin/enforce-mfa/:userId',
    ...protect(verifyToken, 'security.admin', async (req, res) => {
      const uid = parseInt(req.params.userId, 10);
      await queryRows(`UPDATE users SET mfa_enforced = 1 WHERE id = ?`, [uid]);
      await queryRows(
        `INSERT INTO user_mfa_settings (user_id, mfa_enforced) VALUES (?, 1)
         ON DUPLICATE KEY UPDATE mfa_enforced = 1`,
        [uid]
      ).catch(() => {});
      await logSecurityEvent(req, {
        eventType: 'permission_change',
        userId: req.businessUser.id,
        entityType: 'user',
        entityId: uid,
        payload: { action: 'enforce_mfa' },
      });
      res.json({ success: true });
    })
  );

  return router;
}

module.exports = { createSecurityRoutes };
