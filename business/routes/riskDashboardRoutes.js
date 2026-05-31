const express = require('express');
const { protect } = require('../../lib/rbac/protect');
const { queryRows } = require('../../lib/db/safeQuery');
const deviceTrustService = require('../../payments/services/deviceTrustService');
const { scoreLoginRisk } = require('../../lib/security/riskLoginService');
const { getSecurityConfig } = require('../../config/securityConfig');

function createRiskDashboardRoutes({ verifyToken }) {
  const router = express.Router();

  router.get(
    '/dashboard',
    ...protect(verifyToken, 'security.admin', async (req, res) => {
      const config = getSecurityConfig();
      const [incidents, blocked, loginFails] = await Promise.all([
        queryRows(
          `SELECT incident_type, severity, COUNT(*) AS cnt FROM security_incidents
           WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY incident_type, severity`
        ).catch(() => []),
        queryRows(
          `SELECT COUNT(*) AS cnt FROM blocked_devices WHERE is_active = 1`
        ).catch(() => [{ cnt: 0 }]),
        queryRows(
          `SELECT COUNT(*) AS cnt FROM login_attempts WHERE success = 0 AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)`
        ).catch(() => [{ cnt: 0 }]),
      ]);

      const loginRisk = await scoreLoginRisk(req, {
        userId: req.businessUser.id,
        username: req.businessUser.username,
      });
      const deviceTrust = await deviceTrustService.evaluateDeviceTrust(req).catch(() => ({}));

      res.json({
        success: true,
        providers: {
          socure: { enabled: config.socureEnabled, status: config.socureEnabled ? 'configured' : 'disabled' },
          sardine: { enabled: config.sardineEnabled, status: config.sardineEnabled ? 'configured' : 'disabled' },
          internal: { enabled: true, status: 'active' },
        },
        capabilities: {
          deviceFingerprinting: 'implemented',
          ipReputation: 'partial',
          vpnDetection: 'partial',
          torDetection: 'missing',
          velocityChecks: 'implemented',
          impossibleTravel: 'implemented',
          highRiskLoginScoring: 'implemented',
        },
        metrics: {
          incidents7d: incidents,
          blockedDevices: Number(blocked[0]?.cnt || 0),
          failedLogins24h: Number(loginFails[0]?.cnt || 0),
          currentLoginRisk: loginRisk,
          deviceTrust,
        },
      });
    })
  );

  router.post(
    '/login-score',
    ...protect(verifyToken, 'security.view', async (req, res) => {
      const score = await scoreLoginRisk(req, {
        userId: req.businessUser.id,
        username: req.businessUser.username,
      });
      res.json({ success: true, ...score });
    })
  );

  return router;
}

module.exports = { createRiskDashboardRoutes };
