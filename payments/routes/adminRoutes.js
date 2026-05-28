const express = require('express');
const requireRole = require('../middleware/requireRole');
const blockedRepo = require('../repositories/blockedRepository');
const paymentRepo = require('../repositories/paymentRepository');
const { sanitizeString } = require('../utils/sanitize');
const fraudEngine = require('../fraud/fraudEngine');
const { adminLimiter } = require('../middleware/paymentRateLimit');
const { adminIpAllowlist, adminSessionTimeout, adminAudit } = require('../middleware/adminGuard');
const { createAdminApproval } = require('../repositories/securityRepository');
const { parseStrictPositiveInt } = require('../../lib/security/inputGuard');
const { queryRows } = require('../../lib/db/safeQuery');

function createAdminRoutes({ verifyToken, loadAuthUser }) {
  const router = express.Router();
  router.use(verifyToken, loadAuthUser, requireRole('admin'), adminLimiter, adminIpAllowlist, adminSessionTimeout);

  router.get('/payments/monitor', async (req, res, next) => {
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

  router.get('/payments/fraud-queue', async (req, res, next) => {
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

  router.get('/payments/webhooks', async (req, res, next) => {
    try {
      const rows = await queryRows(
        `SELECT id, event_id, event_type, razorpay_order_id, signature_valid, replay_detected, processed, created_at
         FROM payment_webhooks ORDER BY created_at DESC LIMIT 100`
      );
      res.json({ success: true, webhooks: rows });
    } catch (e) {
      next(e);
    }
  });

  router.post('/payments/refund/request', adminAudit('refund_request'), async (req, res, next) => {
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
  });

  router.post('/block-user', adminAudit('block_user'), async (req, res, next) => {
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

  router.post('/unblock-user', adminAudit('unblock_user'), async (req, res, next) => {
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

  router.post('/payments/review/:id', async (req, res, next) => {
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
