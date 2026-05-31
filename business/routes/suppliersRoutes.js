const express = require('express');
const { protect } = require('../../lib/rbac/protect');
const suppliersService = require('../services/suppliersService');

function createSuppliersRoutes({ verifyToken }) {
  const router = express.Router();

  router.get(
    '/',
    ...protect(verifyToken, 'suppliers.view', async (req, res) => {
      res.json({ success: true, suppliers: await suppliersService.listSuppliers() });
    })
  );

  router.post(
    '/',
    ...protect(verifyToken, 'suppliers.manage', async (req, res) => {
      const id = await suppliersService.createSupplier(req.body);
      res.json({ success: true, id });
    })
  );

  router.get(
    '/purchase-orders',
    ...protect(verifyToken, 'suppliers.view', async (req, res) => {
      res.json({ success: true, orders: await suppliersService.listPurchaseOrders() });
    })
  );

  router.post(
    '/purchase-orders',
    ...protect(verifyToken, 'suppliers.manage', async (req, res) => {
      const id = await suppliersService.createPurchaseOrder(req.body, req.businessUser.id);
      res.json({ success: true, id });
    })
  );

  router.post(
    '/stock-inward',
    ...protect(verifyToken, 'suppliers.manage', async (req, res) => {
      const id = await suppliersService.recordStockInward(req.body, req.businessUser.id);
      res.json({ success: true, id });
    })
  );

  router.get(
    '/:id/ledger',
    ...protect(verifyToken, 'suppliers.view', async (req, res) => {
      res.json({
        success: true,
        ledger: await suppliersService.getSupplierLedger(req.params.id),
      });
    })
  );

  router.get(
    '/analytics/purchases',
    ...protect(verifyToken, 'suppliers.view', async (req, res) => {
      res.json({ success: true, ...(await suppliersService.getPurchaseAnalytics()) });
    })
  );

  return router;
}

module.exports = { createSuppliersRoutes };
