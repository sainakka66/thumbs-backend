const express = require('express');
const { requirePermission } = require('../../lib/rbac/requirePermission');
const { queryRows } = require('../../lib/db/safeQuery');
const unifiedAuditRepo = require('../repositories/unifiedAuditRepository');
const ledgerService = require('../ledger/ledgerService');
const paymentRepo = require('../repositories/paymentRepository');

function createAuditOpsRoutes({ verifyToken, loadAuthUser }) {
  const router = express.Router();
  router.use(verifyToken, loadAuthUser);

  router.get('/payments', requirePermission('audit.view'), async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit || '100', 10), 500);
      const entityType = req.query.entityType || null;
      let sql = `SELECT * FROM audit_logs WHERE domain = 'payments'`;
      const params = [];
      if (entityType) {
        sql += ` AND entity_type = ?`;
        params.push(entityType);
      }
      sql += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);
      const rows = await queryRows(sql, params);
      res.json({ success: true, auditLogs: rows });
    } catch (e) {
      next(e);
    }
  });

  router.get('/webhook-events', requirePermission('webhook.view'), async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit || '100', 10), 200);
      let rows;
      try {
        rows = await queryRows(
          `SELECT id, webhook_uuid, provider_event_id, event_type, provider_order_id,
                  signature_valid, processing_status, retry_count, received_at, processed_at
           FROM webhook_events ORDER BY received_at DESC LIMIT ?`,
          [limit]
        );
      } catch (err) {
        if (err.code !== 'ER_NO_SUCH_TABLE') throw err;
        rows = await queryRows(
          `SELECT id, event_id, event_type, razorpay_order_id, signature_valid, processed, created_at
           FROM payment_webhooks ORDER BY created_at DESC LIMIT ?`,
          [limit]
        );
      }
      res.json({ success: true, webhooks: rows });
    } catch (e) {
      next(e);
    }
  });

  router.get('/ledger-entries/:orderUuid', requirePermission('ledger.view'), async (req, res, next) => {
    try {
      const order = await paymentRepo.findOrderByUuid(req.params.orderUuid);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      const entries = await ledgerService.getOrderLedger(order.id);
      res.json({ success: true, orderUuid: order.order_uuid, entries });
    } catch (e) {
      next(e);
    }
  });

  router.get('/entity/:entityType/:entityId', requirePermission('audit.view'), async (req, res, next) => {
    try {
      const logs = await unifiedAuditRepo.listByEntity(req.params.entityType, req.params.entityId, 100);
      res.json({ success: true, auditLogs: logs });
    } catch (e) {
      next(e);
    }
  });

  return router;
}

module.exports = createAuditOpsRoutes;
