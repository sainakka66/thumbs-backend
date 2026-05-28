const logger = require('../../lib/logger');
const { AppError } = require('../../lib/errors');

function paymentErrorHandler(err, req, res, _next) {
  if (res.headersSent) return;

  const status = err.status || 500;
  const payload = {
    success: false,
    message: err.isOperational ? err.message : 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
    requestId: req.requestId,
  };
  if (err.riskScore != null) payload.riskScore = err.riskScore;

  if (!err.isOperational) {
    logger.error(
      { err: err.message, stack: err.stack, path: req.path, requestId: req.requestId },
      'payment_error'
    );
  }

  res.status(status).json(payload);
}

module.exports = paymentErrorHandler;
