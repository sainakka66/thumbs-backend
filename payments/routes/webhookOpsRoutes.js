const express = require('express');
const { requirePermission } = require('../../lib/rbac/requirePermission');
const { privilegedAudit } = require('../middleware/privilegedAudit');
const { adminLimiter } = require('../middleware/paymentRateLimit');
const { adminIpAllowlist, adminSessionTimeout } = require('../middleware/adminGuard');
const paymentService = require('../services/paymentService');

function createWebhookOpsRoutes({ verifyToken, loadAuthUser, io }) {
  const router = express.Router();
  const guards = [verifyToken, loadAuthUser, adminLimiter, adminIpAllowlist, adminSessionTimeout];

  router.post(
    '/replay',
    ...guards,
    requirePermission('webhook.replay'),
    privilegedAudit('webhook_replay', { entityType: 'webhook_event', entityIdFrom: (req) => req.body?.webhookEventId }),
    async (req, res, next) => {
      try {
        const webhookEventId = parseInt(req.body?.webhookEventId || req.body?.id, 10);
        if (!webhookEventId) return res.status(400).json({ success: false, message: 'webhookEventId required' });
        const { replayWebhookEvent } = require('../webhooks/webhookReplayService');
        const result = await replayWebhookEvent({
          webhookEventId,
          io,
          correlationId: req.correlationId,
          emitPaymentEvent: paymentService.emitPaymentEvent,
        });
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    }
  );

  router.post(
    '/reprocess',
    ...guards,
    requirePermission('webhook.replay'),
    privilegedAudit('webhook_reprocess', { entityType: 'webhook_event', entityIdFrom: (req) => req.body?.webhookEventId }),
    async (req, res, next) => {
      try {
        const webhookEventId = parseInt(req.body?.webhookEventId || req.body?.id, 10);
        if (!webhookEventId) return res.status(400).json({ success: false, message: 'webhookEventId required' });
        const { replayWebhookEvent } = require('../webhooks/webhookReplayService');
        const result = await replayWebhookEvent({
          webhookEventId,
          io,
          correlationId: req.correlationId,
          emitPaymentEvent: paymentService.emitPaymentEvent,
          force: true,
        });
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    }
  );

  return router;
}

module.exports = createWebhookOpsRoutes;
