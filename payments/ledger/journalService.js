const { ValidationError } = require('../../lib/errors');
const { withTransaction } = require('../../lib/db/safeQuery');
const ledgerRepo = require('../repositories/ledgerRepository');
const { randomUuid } = require('../utils/crypto');

const ACCOUNT_CODES = {
  CUSTOMER_RESERVE: 'CUSTOMER_RESERVE',
  PLATFORM_HOLDING: 'PLATFORM_HOLDING',
  MERCHANT_SETTLEMENT: 'MERCHANT_SETTLEMENT',
  REFUND: 'REFUND',
};

async function resolveAccount(code) {
  const account = await ledgerRepo.findAccountByCode(code);
  if (!account) {
    throw new ValidationError(`Ledger account not configured: ${code}`);
  }
  return account;
}

async function postBalancedJournal({
  lines,
  referenceType,
  referenceId,
  paymentOrderId,
  paymentTransactionId,
  paymentHoldId,
  paymentRefundId,
  correlationId,
  idempotencyPrefix,
  description,
  metadata,
}) {
  if (!lines?.length || lines.length < 2) {
    throw new ValidationError('Journal requires at least two lines');
  }

  let debitTotal = 0;
  let creditTotal = 0;
  for (const line of lines) {
    if (!line.entryType || !line.accountCode || !line.amountPaise) {
      throw new ValidationError('Invalid journal line');
    }
    if (line.amountPaise <= 0) throw new ValidationError('Journal amount must be positive');
    if (line.entryType === 'DEBIT') debitTotal += line.amountPaise;
    if (line.entryType === 'CREDIT') creditTotal += line.amountPaise;
  }
  if (debitTotal !== creditTotal) {
    throw new ValidationError(`Unbalanced journal: debit=${debitTotal} credit=${creditTotal}`);
  }

  const journalId = randomUuid();
  const prefix = idempotencyPrefix || `journal:${referenceType}:${referenceId}`;
  const firstKey = `${prefix}:DEBIT:${lines.find((l) => l.entryType === 'DEBIT')?.accountCode}`;
  const existing = await ledgerRepo.findEntryByIdempotencyKey(firstKey);
  if (existing) {
    return {
      journalId: existing.journal_id,
      entries: await ledgerRepo.listEntriesByJournalId(existing.journal_id),
      duplicate: true,
    };
  }

  const created = await withTransaction(async () => {
    const entries = [];
    for (const line of lines) {
      const idempotencyKey = line.idempotencyKey || `${prefix}:${line.entryType}:${line.accountCode}`;
      const account = await resolveAccount(line.accountCode);
      const entry = await ledgerRepo.insertEntry({
        journalId,
        ledgerAccountId: account.id,
        ledgerAccountCode: line.accountCode,
        entryType: line.entryType,
        amountPaise: line.amountPaise,
        paymentOrderId,
        paymentTransactionId,
        paymentHoldId,
        paymentRefundId,
        referenceType,
        referenceId,
        description: line.description || description,
        correlationId,
        idempotencyKey,
        metadata,
      });
      entries.push(entry);
    }
    return entries;
  });

  return { journalId, entries: created, duplicate: false };
}

async function postCaptureJournal({ paymentOrderId, paymentTransactionId, amountPaise, providerPaymentId, correlationId }) {
  const prefix = `capture:${providerPaymentId}`;
  const existing = await ledgerRepo.findEntryByIdempotencyKey(`${prefix}:DEBIT:PLATFORM_HOLDING`);
  if (existing) {
    return { journalId: existing.journal_id, entries: await ledgerRepo.listEntriesByJournalId(existing.journal_id), duplicate: true };
  }

  return postBalancedJournal({
    lines: [
      { entryType: 'DEBIT', accountCode: ACCOUNT_CODES.PLATFORM_HOLDING, amountPaise },
      { entryType: 'CREDIT', accountCode: ACCOUNT_CODES.CUSTOMER_RESERVE, amountPaise },
    ],
    referenceType: 'payment_capture',
    referenceId: providerPaymentId,
    paymentOrderId,
    paymentTransactionId,
    correlationId,
    idempotencyPrefix: prefix,
    description: 'Payment captured — funds to platform holding',
  });
}

async function postRefundJournal({
  paymentOrderId,
  paymentTransactionId,
  paymentRefundId,
  amountPaise,
  providerRefundId,
  correlationId,
  fromAccountCode = ACCOUNT_CODES.PLATFORM_HOLDING,
}) {
  const prefix = `refund:${providerRefundId}`;
  const existing = await ledgerRepo.findEntryByIdempotencyKey(`${prefix}:DEBIT:REFUND`);
  if (existing) {
    return { journalId: existing.journal_id, entries: await ledgerRepo.listEntriesByJournalId(existing.journal_id), duplicate: true };
  }

  return postBalancedJournal({
    lines: [
      { entryType: 'DEBIT', accountCode: ACCOUNT_CODES.REFUND, amountPaise },
      { entryType: 'CREDIT', accountCode: fromAccountCode, amountPaise },
    ],
    referenceType: 'payment_refund',
    referenceId: providerRefundId,
    paymentOrderId,
    paymentTransactionId,
    paymentRefundId,
    correlationId,
    idempotencyPrefix: prefix,
    description: 'Refund processed — reversal journal',
  });
}

async function postSettlementJournal({ paymentOrderId, paymentTransactionId, amountPaise, orderId, correlationId }) {
  const prefix = `settle:${orderId}`;
  const existing = await ledgerRepo.findEntryByIdempotencyKey(`${prefix}:DEBIT:MERCHANT_SETTLEMENT`);
  if (existing) {
    return { journalId: existing.journal_id, entries: await ledgerRepo.listEntriesByJournalId(existing.journal_id), duplicate: true };
  }
  return postBalancedJournal({
    lines: [
      { entryType: 'DEBIT', accountCode: ACCOUNT_CODES.MERCHANT_SETTLEMENT, amountPaise },
      { entryType: 'CREDIT', accountCode: ACCOUNT_CODES.PLATFORM_HOLDING, amountPaise },
    ],
    referenceType: 'payment_settlement',
    referenceId: String(orderId),
    paymentOrderId,
    paymentTransactionId,
    correlationId,
    idempotencyPrefix: prefix,
    description: 'Internal settlement — platform holding to merchant settlement',
  });
}

module.exports = {
  ACCOUNT_CODES,
  postBalancedJournal,
  postCaptureJournal,
  postSettlementJournal,
  postRefundJournal,
};
