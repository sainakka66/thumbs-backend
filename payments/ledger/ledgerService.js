const ledgerRepo = require('../repositories/ledgerRepository');
const journalService = require('./journalService');

async function getOrderLedger(paymentOrderId) {
  return ledgerRepo.listEntriesByOrderId(paymentOrderId);
}

async function recordCapture({ order, transaction, providerPaymentId, correlationId }) {
  return journalService.postCaptureJournal({
    paymentOrderId: order.id,
    paymentTransactionId: transaction?.id,
    amountPaise: order.amount_paise,
    providerPaymentId,
    correlationId,
  });
}

async function recordRefund({
  order,
  transaction,
  refund,
  providerRefundId,
  amountPaise,
  correlationId,
  fromAccountCode,
}) {
  return journalService.postRefundJournal({
    paymentOrderId: order.id,
    paymentTransactionId: transaction?.id,
    paymentRefundId: refund?.id,
    amountPaise: amountPaise || order.amount_paise,
    providerRefundId,
    correlationId,
    fromAccountCode,
  });
}

module.exports = {
  getOrderLedger,
  recordCapture,
  recordRefund,
  ACCOUNT_CODES: journalService.ACCOUNT_CODES,
};
