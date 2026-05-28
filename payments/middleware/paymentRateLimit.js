const { limiters } = require('../../lib/rateLimit/enterpriseLimiter');

module.exports = {
  createOrderLimiter: limiters.createOrder,
  verifyLimiter: limiters.verify,
  webhookLimiter: limiters.webhook,
  riskAnalyzeLimiter: limiters.riskAnalyze,
  adminLimiter: limiters.admin,
};
