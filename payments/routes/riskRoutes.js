const express = require('express');
const fraudEngine = require('../fraud/fraudEngine');
const { riskAnalyzeLimiter } = require('../middleware/paymentRateLimit');
const deviceTrustService = require('../services/deviceTrustService');
const { getPaymentLimits } = require('../../config/paymentConfig');
const { inrToPaise } = require('../utils/sanitize');

function createRiskRoutes({ verifyToken, loadAuthUser }) {
  const router = express.Router();
  router.use(verifyToken, loadAuthUser);

  router.post('/analyze', riskAnalyzeLimiter, async (req, res, next) => {
    try {
      const amount = Number(req.body?.amount || 0);
      const limits = getPaymentLimits();
      const amountPaise = inrToPaise(amount);
      const deviceTrust = await deviceTrustService.evaluateDeviceTrust(req);
      const risk = await fraudEngine.analyzePaymentRisk({
        userId: req.authUser.id,
        customerId: req.body?.customerId ? parseInt(req.body.customerId, 10) : null,
        amountPaise,
        ip: req.clientIp,
        deviceFingerprint: req.deviceFingerprint,
        deviceTrust,
        email: req.authUser.email,
      });
      res.json({
        success: true,
        riskScore: risk.score,
        riskCategory: risk.category,
        action: risk.action,
        factors: risk.factors,
        blocked: risk.blocked,
        flagged: risk.flagged,
        hold: risk.hold,
        providers: risk.providers,
        deviceTrust,
        limits,
      });
    } catch (e) {
      next(e);
    }
  });

  return router;
}

module.exports = createRiskRoutes;
