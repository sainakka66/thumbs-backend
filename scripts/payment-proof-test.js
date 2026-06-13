/**
 * End-to-end Razorpay payment proof harness.
 * Requires RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET in env.
 * STOPs if keys missing — cannot claim PRODUCTION READY without successful run.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.railway'), override: true });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const crypto = require('crypto');
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');
const { getRazorpayConfig } = require('../config/paymentConfig');
const unifiedAuditRepo = require('../payments/repositories/unifiedAuditRepository');

async function main() {
  const { keyId, keySecret, webhookSecret } = getRazorpayConfig();
  if (!keyId || !keySecret || !webhookSecret) {
    console.error('\n✗ PAYMENT PROOF STOPPED');
    console.error('  RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET required.');
    console.error('  Configure on Render Dashboard → thumbs-backend → Environment.');
    process.exit(2);
  }

  const config = getDbConfig();
  if (!config) {
    console.error('Database not configured.');
    process.exit(1);
  }

  const conn = await mysql.createConnection(config);

  // Verify audit table works
  const auditUuid = await unifiedAuditRepo.logAudit({
    entityType: 'payment_proof',
    entityId: 0,
    action: 'proof_harness_ping',
    metadata: { at: new Date().toISOString() },
  });
  console.log('✓ Audit insert OK:', auditUuid);

  const [webhooks] = await conn.query(`SELECT COUNT(*) AS c FROM webhook_events`);
  const [ledger] = await conn.query(`SELECT COUNT(*) AS c FROM ledger_entries`);
  const [settlements] = await conn.query(`SELECT COUNT(*) AS c FROM payment_settlements WHERE settlement_status = 'SETTLED'`);
  const [collections] = await conn.query(`SELECT COUNT(*) AS c FROM collections WHERE payment_order_id IS NOT NULL`);

  console.log('\n--- Payment chain counts ---');
  console.log('webhook_events:', webhooks[0].c);
  console.log('ledger_entries:', ledger[0].c);
  console.log('settled:', settlements[0].c);
  console.log('payment collections:', collections[0].c);

  if (webhooks[0].c === 0 || ledger[0].c === 0) {
    console.error('\n✗ PAYMENT PROOF INCOMPLETE');
    console.error('  No completed Razorpay transaction in database.');
    console.error('  Steps:');
    console.error('  1. Deploy recovery code to Render');
    console.error('  2. Set Razorpay env vars on Render');
    console.error('  3. Create order via app → complete UPI test payment');
    console.error('  4. Confirm webhook delivery in Razorpay Dashboard');
    console.error('  5. Re-run: node scripts/payment-proof-test.js');
    await conn.end();
    process.exit(2);
  }

  const [latest] = await conn.query(
    `SELECT po.order_uuid, po.razorpay_order_id, pt.razorpay_payment_id,
            we.id AS webhook_id, we.event_type
     FROM payment_orders po
     JOIN payment_transactions pt ON pt.payment_order_id = po.id
     JOIN webhook_events we ON we.provider_order_id = po.razorpay_order_id
     ORDER BY we.received_at DESC LIMIT 1`
  );

  console.log('\n✓ PAYMENT PROOF EVIDENCE');
  if (latest.length) {
    console.log(JSON.stringify(latest[0], null, 2));
  }

  await conn.end();
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
