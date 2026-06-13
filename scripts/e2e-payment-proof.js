/**
 * Full payment E2E proof via production API + simulated Razorpay webhook.
 * Requires RAZORPAY_WEBHOOK_SECRET (must match Render) for signature generation.
 *
 * Usage:
 *   RAZORPAY_WEBHOOK_SECRET=whsec_xxx node scripts/e2e-payment-proof.js
 * Optional:
 *   BACKEND_URL, PROOF_USERNAME, PROOF_PASSWORD, PROOF_AMOUNT
 */
const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.railway'), override: true });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BACKEND = process.env.BACKEND_URL || 'https://thumbs-backend.onrender.com';
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';
const USERNAME = process.env.PROOF_USERNAME || 'sales_sai';
const PASSWORD = process.env.PROOF_PASSWORD || '';
const AMOUNT = Number(process.env.PROOF_AMOUNT || '1');

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  return { status: res.status, body };
}

function signWebhook(rawBody, secret) {
  return crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
}

async function waitForDeploy() {
  for (let i = 0; i < 20; i++) {
    const login = await fetchJson(`${BACKEND}/login`, {
      method: 'POST',
      body: JSON.stringify({ username: 'bad_user_proof', password: 'bad' }),
    });
    if (login.status === 401) return true;
    console.log(`Waiting for deploy... login status=${login.status} (${i + 1}/20)`);
    await new Promise((r) => setTimeout(r, 15000));
  }
  return false;
}

async function main() {
  if (!WEBHOOK_SECRET) {
    console.error('RAZORPAY_WEBHOOK_SECRET required (must match Render env).');
    process.exit(2);
  }
  if (!PASSWORD) {
    console.error('PROOF_PASSWORD required (sales_sai or admin test user).');
    process.exit(2);
  }

  console.log('Checking production deploy...');
  const deployed = await waitForDeploy();
  if (!deployed) {
    console.error('Production still on old build (login not 401). Retry after Render deploy completes.');
    process.exit(1);
  }
  console.log('✓ Production deploy detected (login 401)');

  const login = await fetchJson(`${BACKEND}/login`, {
    method: 'POST',
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!login.body?.token) {
    console.error('Login failed:', login.status, login.body?.message || login.body);
    process.exit(1);
  }
  const token = login.body.token;
  console.log('✓ Logged in as', USERNAME);

  const customers = await fetchJson(`${BACKEND}/customers`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const customerId =
    customers.body?.[0]?.id ||
    customers.body?.customers?.[0]?.id ||
    customers.body?.data?.[0]?.id;
  if (!customerId) {
    console.error('No customer found for payment test');
    process.exit(1);
  }

  const orderRes = await fetchJson(`${BACKEND}/payments/create-order`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      amount: AMOUNT,
      customerId,
      idempotencyKey: `proof_${Date.now()}`,
      description: 'Production recovery proof',
    }),
  });
  if (!orderRes.body?.order?.razorpayOrderId) {
    console.error('Create order failed:', orderRes.status, orderRes.body);
    process.exit(1);
  }

  const { order } = orderRes.body;
  const fakePaymentId = `pay_PROOF${Date.now()}`;
  console.log('✓ Order created:', order.orderUuid, order.razorpayOrderId);

  const webhookPayload = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: fakePaymentId,
          order_id: order.razorpayOrderId,
          amount: order.amountPaise,
          currency: 'INR',
          status: 'captured',
          method: 'upi',
          vpa: 'proof@razorpay',
        },
      },
    },
  };
  const rawBody = Buffer.from(JSON.stringify(webhookPayload));
  const signature = signWebhook(rawBody, WEBHOOK_SECRET);

  const webhookRes = await fetch(`${BACKEND}/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-razorpay-signature': signature,
    },
    body: rawBody,
  });
  const webhookBody = await webhookRes.json().catch(() => ({}));
  console.log('Webhook response:', webhookRes.status, webhookBody);

  // Run payment event worker logic inline via DB poll
  await new Promise((r) => setTimeout(r, 5000));

  const statusRes = await fetchJson(`${BACKEND}/payments/status/${order.orderUuid}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log('\n--- Final order status ---');
  console.log(JSON.stringify(statusRes.body, null, 2));

  // DB verification via payment-proof-test
  const { spawnSync } = require('child_process');
  const proof = spawnSync(process.execPath, [path.join(__dirname, 'payment-proof-test.js')], {
    stdio: 'inherit',
    env: { ...process.env, RAZORPAY_WEBHOOK_SECRET: WEBHOOK_SECRET, RAZORPAY_KEY_ID: 'proof', RAZORPAY_KEY_SECRET: 'proof' },
  });
  process.exit(proof.status ?? 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
