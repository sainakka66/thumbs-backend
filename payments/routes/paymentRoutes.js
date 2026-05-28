const express = require('express');
const paymentService = require('../services/paymentService');
const { validateCreateOrder, validateVerify } = require('../validators/paymentDto');
const { createOrderLimiter, verifyLimiter } = require('../middleware/paymentRateLimit');
const { parseStrictPositiveInt, validateUuid } = require('../../lib/security/inputGuard');
function createPaymentRoutes({ verifyToken, loadAuthUser, io }) {
  const router = express.Router();

  router.use(verifyToken, loadAuthUser);

  router.post('/create-order', createOrderLimiter, async (req, res, next) => {
    try {
      const dto = validateCreateOrder(req.body);
      req.body = { ...req.body, ...dto };
      const result = await paymentService.createOrder(req, io);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.post('/verify', verifyLimiter, async (req, res, next) => {
    try {
      req.body = validateVerify(req.body);
      const result = await paymentService.verifyPayment(req, io);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.get('/status/:id', async (req, res, next) => {
    try {
      const result = await paymentService.getPaymentStatus(req);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  router.get('/history', async (req, res, next) => {
    try {
      const paymentRepo = require('../repositories/paymentRepository');
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
      const offset = parseInt(req.query.offset || '0', 10);
      const rows = await paymentRepo.listPaymentHistory({
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

  router.post('/refund', async (req, res, next) => {
    try {
      if (req.authUser.role !== 'admin') {
        return next(new (require('../../lib/errors').ForbiddenError)());
      }
      const result = await paymentService.initiateRefund(req, io);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  return router;
}

module.exports = createPaymentRoutes;
