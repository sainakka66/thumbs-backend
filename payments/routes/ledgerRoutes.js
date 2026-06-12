const express = require('express');
const { requirePermission } = require('../../lib/rbac/requirePermission');
const { privilegedAudit } = require('../middleware/privilegedAudit');
const paymentRepo = require('../repositories/paymentRepository');
const ledgerService = require('../ledger/ledgerService');
const journalService = require('../ledger/journalService');
const { assertCanViewPayment } = require('../lib/paymentAccess');

function createLedgerRoutes({ verifyToken, loadAuthUser }) {
  const router = express.Router();
  router.use(verifyToken, loadAuthUser);

  router.get('/:orderUuid', requirePermission('ledger.view'), async (req, res, next) => {
    try {
      const order = await paymentRepo.findOrderByUuid(req.params.orderUuid);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      assertCanViewPayment(req, order);
      const entries = await ledgerService.getOrderLedger(order.id);
      res.json({ success: true, orderUuid: order.order_uuid, entries });
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/reversal',
    requirePermission('ledger.reverse'),
    privilegedAudit('ledger_reversal', { entityType: 'ledger', entityIdFrom: (req) => req.body?.orderUuid }),
    async (req, res, next) => {
      try {
        const { orderUuid, amountPaise, reason } = req.body || {};
        if (!orderUuid) return res.status(400).json({ success: false, message: 'orderUuid required' });
        const order = await paymentRepo.findOrderByUuid(orderUuid);
        if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
        const transaction = await paymentRepo.getLatestTransaction(order.id);
        const amount = amountPaise || order.amount_paise;
        const journal = await journalService.postRefundJournal({
          paymentOrderId: order.id,
          paymentTransactionId: transaction?.id,
          amountPaise: amount,
          correlationId: req.correlationId,
          providerRefundId: `manual-reversal:${order.id}:${Date.now()}`,
          fromAccountCode: journalService.ACCOUNT_CODES.PLATFORM_HOLDING,
        });
        res.json({ success: true, journal, reason: reason || 'manual_reversal' });
      } catch (e) {
        next(e);
      }
    }
  );

  return router;
}

module.exports = createLedgerRoutes;
