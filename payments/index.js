const express = require('express');
const requestContext = require('./middleware/requestContext');
const paymentErrorHandler = require('./middleware/errorHandler');
const createPaymentRoutes = require('./routes/paymentRoutes');
const createRiskRoutes = require('./routes/riskRoutes');
const createAdminRoutes = require('./routes/adminRoutes');
const paymentService = require('./services/paymentService');
const { webhookLimiter } = require('./middleware/paymentRateLimit');
const { httpsEnforce, hstsHeader } = require('./middleware/httpsEnforce');
const originGuard = require('./middleware/originGuard');
const inputSanitizer = require('./middleware/inputSanitizer');
const logger = require('../lib/logger');

function mountWebhook(app, io) {
  app.post(
    '/payments/webhook',
    httpsEnforce,
    hstsHeader,
    webhookLimiter,
    express.raw({ type: 'application/json' }),
    async (req, res) => {
      try {
        const signature = req.headers['x-razorpay-signature'];
        const result = await paymentService.processWebhook(req.body, signature, io, req.clientIp || req.ip);
        res.status(result.ok ? 200 : 400).json(result);
      } catch (err) {
        logger.error({ err: err.message }, 'webhook_error');
        res.status(500).json({ ok: false });
      }
    }
  );
}

function mountPayments(app, { verifyToken, io }) {
  const loadAuthUser = require('./middleware/loadAuthUser');

  app.use(httpsEnforce);
  app.use(hstsHeader);
  app.use(requestContext);
  app.use(inputSanitizer);
  app.use('/payments', originGuard, createPaymentRoutes({ verifyToken, loadAuthUser, io }));
  app.use('/risk', originGuard, createRiskRoutes({ verifyToken, loadAuthUser }));
  app.use('/admin', originGuard, createAdminRoutes({ verifyToken, loadAuthUser }));
  app.use(paymentErrorHandler);
}

module.exports = { mountPayments, mountWebhook };
