/**
 * In-process payment pipeline proof against Railway DB.
 * Simulates payment.captured webhook → event bus → settlement → collection.
 * Does NOT call Razorpay API — uses existing INITIATED order or creates DB-only order.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.railway'), override: true });

process.env.RAZORPAY_WEBHOOK_SECRET =
  process.env.RAZORPAY_WEBHOOK_SECRET || 'local_pipeline_proof_secret';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_proof';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'proof_secret';

const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');
const { randomUuid } = require('../payments/utils/crypto');
const { ingestWebhook } = require('../payments/webhooks/webhookIngestService');
const { runEventConsumerBatch } = require('../payments/events/eventConsumerWorker');

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'local_pipeline_proof_secret';

async function ensureTestOrder(conn) {
  const [rows] = await conn.query(
    `SELECT po.*, pt.id AS tx_id FROM payment_orders po
     LEFT JOIN payment_transactions pt ON pt.payment_order_id = po.id
     WHERE po.razorpay_order_id IS NOT NULL AND po.status IN ('INITIATED','CREATED','PENDING')
     ORDER BY po.id DESC LIMIT 1`
  );
  if (rows.length) return rows[0];

  const [customers] = await conn.query(`SELECT id FROM customers LIMIT 1`);
  const [users] = await conn.query(`SELECT id FROM users WHERE username = 'sales_sai' LIMIT 1`);
  if (!customers.length || !users.length) throw new Error('Need customer and sales_sai user');

  const orderUuid = randomUuid();
  const rzOrderId = `order_PROOF${Date.now()}`;
  const [ins] = await conn.query(
    `INSERT INTO payment_orders (
      order_uuid, user_id, customer_id, amount_paise, amount_inr, currency, status,
      lifecycle_stage, razorpay_order_id, receipt_ref, description
    ) VALUES (?, ?, ?, 100, 1.00, 'INR', 'INITIATED', 'PENDING', ?, ?, 'Pipeline proof')`,
    [orderUuid, users[0].id, customers[0].id, rzOrderId, `TU-PROOF-${Date.now()}`]
  );
  const orderId = ins.insertId;
  await conn.query(
    `INSERT INTO payment_transactions (payment_order_id, status, lifecycle_stage, amount_paise)
     VALUES (?, 'INITIATED', 'PENDING', 100)`,
    [orderId]
  );
  const [created] = await conn.query(`SELECT * FROM payment_orders WHERE id = ?`, [orderId]);
  return created[0];
}

async function runEventWorkerOnce() {
  const batch = await runEventConsumerBatch({ limit: 10 });
  return batch.processed;
}

async function verify(conn, orderId) {
  const checks = {};
  const [[order]] = await conn.query(`SELECT * FROM payment_orders WHERE id = ?`, [orderId]);
  checks.order = { status: order.status, lifecycle: order.lifecycle_stage };

  const [webhooks] = await conn.query(
    `SELECT id, event_type, processing_status FROM webhook_events WHERE provider_order_id = ? ORDER BY id DESC LIMIT 1`,
    [order.razorpay_order_id]
  );
  checks.webhook = webhooks[0] || null;

  const [ledger] = await conn.query(
    `SELECT COUNT(*) AS c FROM ledger_entries WHERE payment_order_id = ?`,
    [orderId]
  );
  checks.ledgerCount = ledger[0].c;

  const [settlements] = await conn.query(
    `SELECT id, settlement_status FROM payment_settlements WHERE payment_order_id = ?`,
    [orderId]
  );
  checks.settlement = settlements[0] || null;

  const [collections] = await conn.query(
    `SELECT id, amount, payment_method FROM collections WHERE payment_order_id = ?`,
    [orderId]
  );
  checks.collection = collections[0] || null;

  const [audits] = await conn.query(
    `SELECT COUNT(*) AS c FROM payment_domain_audit_logs WHERE entity_type = 'payment_order' AND entity_id = ?`,
    [orderId]
  );
  checks.auditCount = audits[0].c;

  return checks;
}

async function main() {
  if (!WEBHOOK_SECRET) {
    console.error('RAZORPAY_WEBHOOK_SECRET missing');
    process.exit(2);
  }

  const conn = await mysql.createConnection(getDbConfig());
  const order = await ensureTestOrder(conn);
  const paymentId = `pay_PROOF${Date.now()}`;
  const correlationId = randomUuid();

  console.log('Using order:', order.order_uuid, order.razorpay_order_id);

  const payload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: paymentId,
          order_id: order.razorpay_order_id,
          amount: order.amount_paise,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          vpa: 'success@razorpay',
        },
      },
    },
  };
  const rawBody = Buffer.from(JSON.stringify(payload));
  const crypto = require('crypto');
  const signature = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

  const ingest = await ingestWebhook({
    rawBody,
    signature,
    io: null,
    sourceIp: '127.0.0.1',
    correlationId,
    emitPaymentEvent: () => {},
  });
  console.log('Ingest:', ingest);

  let processed = 0;
  for (let i = 0; i < 5; i++) {
    processed += await runEventWorkerOnce();
    if (processed > 0) break;
    await new Promise((r) => setTimeout(r, 500));
  }
  console.log('Events processed:', processed);

  const result = await verify(conn, order.id);
  console.log('\n=== PIPELINE PROOF ===');
  console.log(JSON.stringify(result, null, 2));

  const ok =
    result.order?.status === 'SUCCESS' &&
    result.order?.lifecycle === 'SETTLED' &&
    result.webhook &&
    result.ledgerCount > 0 &&
    result.settlement?.settlement_status === 'SETTLED' &&
    result.collection &&
    result.auditCount > 0;

  await conn.end();
  if (!ok) {
    console.error('\n✗ Pipeline incomplete');
    process.exit(1);
  }
  console.log('\n✓ Full pipeline verified on Railway DB');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
