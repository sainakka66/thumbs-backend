const { randomUuid } = require('../utils/crypto');

function resolveCorrelationId(req) {
  return (
    req?.headers?.['x-correlation-id'] ||
    req?.correlationId ||
    req?.requestId ||
    randomUuid()
  );
}

function attachCorrelation(req, res, next) {
  const correlationId = resolveCorrelationId(req);
  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);
  next();
}

module.exports = { resolveCorrelationId, attachCorrelation };
