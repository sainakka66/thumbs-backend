const { applyCapture } = require('./capturedHandler');

async function handleOrderPaid(ctx) {
  return applyCapture({ ...ctx, eventSource: ctx.eventSource || 'WEBHOOK' });
}

module.exports = { handleOrderPaid };
