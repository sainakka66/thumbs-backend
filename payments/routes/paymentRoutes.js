const express = require('express');
const { requirePermission } = require('../../lib/rbac/requirePermission');
const { privilegedAudit } = require('../middleware/privilegedAudit');
const paymentService = require('../services/paymentService');
const { validateCreateOrder, validateVerify } = require('../validators/paymentDto');
const { createOrderLimiter, verifyLimiter } = require('../middleware/paymentRateLimit');
const { assertCanCreatePayment } = require('../lib/paymentAccess');

function createPaymentRoutes({ verifyToken, loadAuthUser, io }) {
  const router = express.Router();
  router.use(verifyToken, loadAuthUser);

  router.post('/create-order', requirePermission('payments.create'), createOrderLimiter, async (req, res, next) => {
    try {
      assertCanCreatePayment(req);
      const dto = validateCreateOrder(req.body);
      req.body = { ...req.body, ...dto };
      const result = await paymentService.createOrder(req, io);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.post('/verify', requirePermission('payments.create'), verifyLimiter, async (req, res, next) => {
    try {
      req.body = validateVerify(req.body);
      const result = await paymentService.verifyPayment(req, io);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.get('/history', requirePermission('payments.view.self', 'payments.view.all', 'payments.view'), async (req, res, next) => {
    try {
      const paymentRepo = require('../repositories/paymentRepository');
      const { canViewAllPayments } = require('../lib/paymentAccess');
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
      const offset = parseInt(req.query.offset || '0', 10);
      const rows = canViewAllPayments(req)
        ? await paymentRepo.listAdminPayments({ limit, offset, status: req.query.status || null })
        : await paymentRepo.listPaymentHistory({
            userId: req.authUser.id,
            limit,
            offset,
            status: req.query.status || null,
          });
      res.json({ success: true, payments: rows });
    } catch (e) {
      next(e);
    }
  });

  router.get('/status/:id', requirePermission('payments.view.self', 'payments.view.all', 'payments.view'), async (req, res, next) => {
    try {
      const result = await paymentService.getPaymentStatus(req);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.get('/:id', requirePermission('payments.view.self', 'payments.view.all', 'payments.view'), async (req, res, next) => {
    try {
      const result = await paymentService.getPaymentStatus(req);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/refund',
    requirePermission('payments.refund.execute'),
    privilegedAudit('refund_execute', { entityType: 'payment_order', entityIdFrom: (req) => req.body?.orderUuid }),
    async (req, res, next) => {
      try {
        const result = await paymentService.initiateRefund(req, io);
        res.json(result);
      } catch (e) {
        next(e);
      }
    }
  );

  return router;
}

module.exports = createPaymentRoutes;
