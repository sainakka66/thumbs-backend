const express = require('express');
const { requirePermission, hasAnyPermission } = require('../../lib/rbac/requirePermission');
const { ForbiddenError } = require('../../lib/errors');
const { privilegedAudit } = require('../middleware/privilegedAudit');
const paymentRepo = require('../repositories/paymentRepository');
const settlementRepo = require('../repositories/settlementRepository');
const settlementService = require('../settlement/settlementService');
const { assertCanViewPayment } = require('../lib/paymentAccess');

function createSettlementRoutes({ verifyToken, loadAuthUser }) {
  const router = express.Router();
  router.use(verifyToken, loadAuthUser);

  router.get('/:orderUuid', requirePermission('settlement.view'), async (req, res, next) => {
    try {
      const order = await paymentRepo.findOrderByUuid(req.params.orderUuid);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      assertCanViewPayment(req, order);
      const settlement = await settlementRepo.findByOrderId(order.id);
      res.json({
        success: true,
        orderUuid: order.order_uuid,
        lifecycleStage: order.lifecycle_stage,
        settlement: settlement || null,
      });
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/execute',
    requirePermission('settlement.execute'),
    privilegedAudit('settlement_execute', { entityType: 'payment_order', entityIdFrom: (req) => req.body?.orderUuid }),
    async (req, res, next) => {
      try {
        const { orderUuid, force } = req.body || {};
        if (!orderUuid) return res.status(400).json({ success: false, message: 'orderUuid required' });
        if (force && !hasAnyPermission(req, ['admin.override'])) {
          throw new ForbiddenError('admin.override required for forced settlement');
        }
        const order = await paymentRepo.findOrderByUuid(orderUuid);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        const result = await settlementService.settleCapturedOrder({
          orderId: order.id,
          correlationId: req.correlationId,
          eventSource: 'ADMIN',
        });
        res.json({ success: true, ...result });
      } catch (e) {
        next(e);
      }
    }
  );

  return router;
}

module.exports = createSettlementRoutes;
