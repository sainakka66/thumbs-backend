const express = require('express');
const { requirePermission } = require('../../lib/rbac/requirePermission');
const blockedRepo = require('../repositories/blockedRepository');
const paymentRepo = require('../repositories/paymentRepository');
const { sanitizeString } = require('../utils/sanitize');
const fraudEngine = require('../fraud/fraudEngine');
const { adminLimiter } = require('../middleware/paymentRateLimit');
const { adminIpAllowlist, adminSessionTimeout, adminAudit } = require('../middleware/adminGuard');
const { privilegedAudit } = require('../middleware/privilegedAudit');
const { createAdminApproval } = require('../repositories/securityRepository');
const { parseStrictPositiveInt } = require('../../lib/security/inputGuard');
const { queryRows } = require('../../lib/db/safeQuery');

function createAdminRoutes({ verifyToken, loadAuthUser, io }) {
  const router = express.Router();
  router.use(verifyToken, loadAuthUser, adminLimiter);

  router.get('/payments/monitor', requirePermission('payments.view.all', 'payments.view'), async (req, res, next) => {
    try {
      const rows = await paymentRepo.listAdminPayments({
        limit: Math.min(parseInt(req.query.limit || '50', 10), 200),
        offset: parseInt(req.query.offset || '0', 10),
        status: req.query.status || null,
        flaggedOnly: req.query.flagged === '1',
      });
      const stats = await queryRows(
        `SELECT status, COUNT(*) AS cnt, SUM(amount_inr) AS total
         FROM payment_orders WHERE deleted_at IS NULL AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
         GROUP BY status`
      );
      res.json({ success: true, payments: rows, weeklyStats: stats });
    } catch (e) {
      next(e);
    }
  });

  router.get('/payments/fraud-queue', requirePermission('payments.view.all', 'payments.view'), async (req, res, next) => {
    try {
      const rows = await queryRows(
        `SELECT sa.*, u.username FROM suspicious_activities sa
         LEFT JOIN users u ON u.id = sa.user_id
         WHERE sa.reviewed = 0 ORDER BY sa.created_at DESC LIMIT 100`
      );
      res.json({ success: true, items: rows });
    } catch (e) {
      next(e);
    }
  });

  router.get('/payments/webhooks', requirePermission('webhook.view'), async (req, res, next) => {
    try {
      let rows;
      try {
        rows = await queryRows(
          `SELECT id, webhook_uuid, provider_event_id AS event_id, event_type, provider_order_id AS razorpay_order_id,
                  signature_valid, processing_status, retry_count, received_at AS created_at, processed_at
           FROM webhook_events ORDER BY received_at DESC LIMIT 100`
        );
      } catch (err) {
        if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
        rows = await queryRows(
          `SELECT id, event_id, event_type, razorpay_order_id, signature_valid, replay_detected, processed, created_at
           FROM payment_webhooks ORDER BY created_at DESC LIMIT 100`
        );
      }
      res.json({ success: true, webhooks: rows });
    } catch (e) {
      next(e);
    }
  });

  router.get('/payments/timeline/:orderUuid', requirePermission('payments.view.all', 'payments.view'), async (req, res, next) => {
    try {
      const timelineRepo = require('../repositories/timelineRepository');
      const items = await timelineRepo.listByOrderUuid(req.params.orderUuid);
      res.json({ success: true, timeline: items });
    } catch (e) {
      next(e);
    }
  });

  router.get('/payments/ledger/:orderUuid', requirePermission('ledger.view'), async (req, res, next) => {
    try {
      const ledgerService = require('../ledger/ledgerService');
      const order = await paymentRepo.findOrderByUuid(req.params.orderUuid);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      const entries = await ledgerService.getOrderLedger(order.id);
      res.json({ success: true, orderUuid: order.order_uuid, entries });
    } catch (e) {
      next(e);
    }
  });

  router.get('/payments/reconciliation', requirePermission('reconciliation.view'), async (req, res, next) => {
    try {
      const reconciliationRepo = require('../repositories/reconciliationRepository');
      const runs = await reconciliationRepo.listRecentRuns(20);
      res.json({ success: true, runs });
    } catch (e) {
      next(e);
    }
  });

  router.get('/payments/reconciliation/:runId', requirePermission('reconciliation.view'), async (req, res, next) => {
    try {
      const reconciliationRepo = require('../repositories/reconciliationRepository');
      const results = await reconciliationRepo.listResultsByRun(parseInt(req.params.runId, 10));
      res.json({ success: true, results });
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/payments/reconciliation/run',
    adminIpAllowlist,
    adminSessionTimeout,
    requirePermission('reconciliation.run'),
    privilegedAudit('reconciliation_run'),
    adminAudit('reconciliation_run'),
    async (req, res, next) => {
      try {
        const { runFullReconciliation } = require('../reconciliation/reconciliationService');
        const result = await runFullReconciliation({ triggerSource: 'MANUAL', actorUserId: req.authUser?.id });
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    }
  );

  router.get('/payments/events/dead-letter', requirePermission('reconciliation.view'), async (req, res, next) => {
    try {
      const paymentEventRepo = require('../repositories/paymentEventRepository');
      const events = await paymentEventRepo.listDeadLetter(50);
      res.json({ success: true, events });
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/payments/events/dead-letter/:id/retry',
    requirePermission('reconciliation.run'),
    privilegedAudit('dead_letter_retry', { entityType: 'payment_event', entityIdFrom: (req) => req.params.id }),
    async (req, res, next) => {
      try {
        const paymentEventRepo = require('../repositories/paymentEventRepository');
        const ok = await paymentEventRepo.requeueDeadLetter(parseInt(req.params.id, 10));
        if (!ok) return res.status(404).json({ success: false, message: 'Dead-letter event not found' });
        res.json({ success: true, eventId: parseInt(req.params.id, 10), status: 'PENDING' });
      } catch (e) {
        next(e);
      }
    }
  );

  router.get('/payments/checklist/:orderUuid', requirePermission('reconciliation.view'), async (req, res, next) => {
    try {
      const { answerChecklistForOrder } = require('../reconciliation/reconciliationService');
      const order = await paymentRepo.findOrderByUuid(req.params.orderUuid);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      const checklist = await answerChecklistForOrder(order.id);
      res.json({ success: true, checklist });
    } catch (e) {
      next(e);
    }
  });

  router.get('/ops/dashboard', requirePermission('reconciliation.view'), async (req, res, next) => {
    try {
      const { getQueueMetrics } = require('../ops/opsMetricsService');
      const dashboard = await getQueueMetrics();
      res.json({ success: true, dashboard });
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/payments/webhooks/:id/replay',
    adminIpAllowlist,
    adminSessionTimeout,
    requirePermission('webhook.replay'),
    privilegedAudit('webhook_replay', { entityType: 'webhook_event', entityIdFrom: (req) => req.params.id }),
    adminAudit('webhook_replay'),
    async (req, res, next) => {
      try {
        const { replayWebhookEvent } = require('../webhooks/webhookReplayService');
        const paymentService = require('../services/paymentService');
        const result = await replayWebhookEvent({
          webhookEventId: parseInt(req.params.id, 10),
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
    '/payments/refund/request',
    requirePermission('payments.refund.approve'),
    privilegedAudit('refund_approve_request', { entityType: 'payment_order', entityIdFrom: (req) => req.body?.orderUuid }),
    adminAudit('refund_request'),
    async (req, res, next) => {
      try {
        const orderUuid = req.body?.orderUuid;
        if (!orderUuid) return res.status(400).json({ success: false, message: 'orderUuid required' });
        const approvalId = await createAdminApproval({
          actionType: 'refund',
          targetRef: orderUuid,
          requestedBy: req.authUser.id,
          payload: req.body,
        });
        res.json({ success: true, approvalId, status: 'PENDING' });
      } catch (e) {
        next(e);
      }
    }
  );

  router.post('/block-user', requirePermission('users.manage'), adminAudit('block_user'), async (req, res, next) => {
    try {
      const userId = parseStrictPositiveInt(req.body?.userId, 'userId');
      const reason = sanitizeString(req.body?.reason, 512) || 'Admin block';
      if (!userId) return res.status(400).json({ success: false, message: 'userId required' });
      await blockedRepo.blockEntity({
        entityType: 'user',
        entityValue: String(userId),
        reason,
        blockedBy: req.authUser.id,
      });
      await queryRows(`UPDATE users SET status = 'banned' WHERE id = ?`, [userId]);
      await fraudEngine.recordSuspicious({
        userId,
        activityType: 'admin_block',
        severity: 'critical',
        riskScore: 100,
        ipAddress: req.clientIp,
        details: { reason, blockedBy: req.authUser.id },
      });
      res.json({ success: true, message: 'User blocked' });
    } catch (e) {
      next(e);
    }
  });

  router.post('/unblock-user', requirePermission('users.manage'), adminAudit('unblock_user'), async (req, res, next) => {
    try {
      const userId = parseStrictPositiveInt(req.body?.userId, 'userId');
      if (!userId) return res.status(400).json({ success: false, message: 'userId required' });
      await blockedRepo.unblockEntity('user', String(userId));
      await queryRows(`UPDATE users SET status = 'active' WHERE id = ?`, [userId]);
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });

  router.post('/payments/review/:id', requirePermission('payments.view.all', 'payments.view'), async (req, res, next) => {
    try {
      const id = parseInt(req.params.id, 10);
      await queryRows(
        `UPDATE suspicious_activities SET reviewed = 1, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?`,
        [req.authUser.id, id]
      );
      res.json({ success: true });
    } catch (e) {
      next(e);
    }
  });

  return router;
}

module.exports = createAdminRoutes;
