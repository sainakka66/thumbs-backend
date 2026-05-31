const express = require('express');
const { protect } = require('../../lib/rbac/protect');
const collectionsService = require('../services/collectionsService');
const { logSecurityEvent } = require('../../lib/security/securityAuditService');

function createCollectionsRoutes({ verifyToken }) {
  const router = express.Router();

  router.get(
    '/dues/dashboard',
    ...protect(verifyToken, 'collections.view', async (req, res) => {
      const data = await collectionsService.getDuesDashboard();
      res.json({ success: true, ...data });
    })
  );

  router.get(
    '/',
    ...protect(verifyToken, 'collections.view', async (req, res) => {
      const rows = await collectionsService.listCollections({
        customerId: req.query.customerId,
      });
      res.json({ success: true, collections: rows });
    })
  );

  router.post(
    '/',
    ...protect(verifyToken, 'collections.manage', async (req, res) => {
      const id = await collectionsService.recordCollection(req.body, req.businessUser.id);
      await logSecurityEvent(req, {
        eventType: 'sale_create',
        userId: req.businessUser.id,
        entityType: 'collection',
        entityId: id,
        payload: req.body,
      });
      res.json({ success: true, id });
    })
  );

  router.get(
    '/upi-qr/:customerId',
    ...protect(verifyToken, 'collections.view', async (req, res) => {
      const qr = await collectionsService.getCustomerUpiQr(req.params.customerId);
      if (!qr) return res.status(404).json({ success: false, message: 'Customer not found' });
      res.json({ success: true, ...qr });
    })
  );

  router.get(
    '/feature-flags',
    ...protect(verifyToken, 'collections.view', async (req, res) => {
      const flags = await collectionsService.getFeatureFlags();
      res.json({ success: true, flags });
    })
  );

  return router;
}

module.exports = { createCollectionsRoutes };
