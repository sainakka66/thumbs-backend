const express = require('express');
const { requirePermission } = require('../../lib/rbac/requirePermission');
const { privilegedAudit } = require('../middleware/privilegedAudit');
const { getHealthSnapshot, getQueueMetrics } = require('../ops/opsMetricsService');
const paymentEventRepo = require('../repositories/paymentEventRepository');

function createOpsRoutes({ verifyToken, loadAuthUser }) {
  const router = express.Router();

  router.get('/health', async (_req, res, next) => {
    try {
      const snapshot = await getHealthSnapshot();
      res.status(snapshot.healthy ? 200 : 503).json({ success: snapshot.healthy, ...snapshot });
    } catch (e) {
      next(e);
    }
  });

  router.use(verifyToken, loadAuthUser);

  router.get('/dashboard', requirePermission('reconciliation.view'), async (_req, res, next) => {
    try {
      const metrics = await getQueueMetrics();
      res.json({ success: true, dashboard: metrics });
    } catch (e) {
      next(e);
    }
  });

  router.get('/alerts', requirePermission('reconciliation.view'), async (_req, res, next) => {
    try {
      const snapshot = await getHealthSnapshot();
      res.json({ success: true, healthy: snapshot.healthy, alerts: snapshot.alerts });
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/events/dead-letter/:id/retry',
    requirePermission('reconciliation.run'),
    privilegedAudit('dead_letter_retry', { entityType: 'payment_event', entityIdFrom: (req) => req.params.id }),
    async (req, res, next) => {
      try {
        const id = parseInt(req.params.id, 10);
        const ok = await paymentEventRepo.requeueDeadLetter(id);
        if (!ok) return res.status(404).json({ success: false, message: 'Dead-letter event not found' });
        res.json({ success: true, eventId: id, status: 'PENDING' });
      } catch (e) {
        next(e);
      }
    }
  );

  return router;
}

module.exports = createOpsRoutes;
