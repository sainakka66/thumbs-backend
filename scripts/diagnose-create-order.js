/**
 * Diagnose create-order failure against Railway DB (no secrets stored).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.railway'), override: true });

process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || process.argv[2];
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || process.argv[3];
process.env.NODE_ENV = 'production';

const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');

async function main() {
  const conn = await mysql.createConnection(getDbConfig());
  const [users] = await conn.query(
    `SELECT u.id, u.username, u.role, u.status, u.is_active, r.slug AS role_slug
     FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.username = 'sales_sai' LIMIT 1`
  );
  await conn.end();
  if (!users.length) throw new Error('sales_sai not found');
  const u = users[0];

  const conn2 = await mysql.createConnection(getDbConfig());
  const [customerRows] = await conn2.query('SELECT id FROM customers LIMIT 1');
  await conn2.end();
  if (!customerRows.length) throw new Error('No customers in DB');

  const paymentService = require('../payments/services/paymentService');
  const req = {
    body: { amount: 1, customerId: customerRows[0].id, idempotencyKey: `diag_${Date.now()}` },
    authUser: {
      id: u.id,
      username: u.username,
      role: u.role_slug || 'SALESPERSON',
      status: u.status || 'active',
      is_active: u.is_active ?? 1,
    },
    permissions: new Set(['payments.create', 'payments.view.self', 'payments.view']),
    clientIp: '127.0.0.1',
    deviceFingerprint: 'proof-device',
    userAgent: 'proof-script',
  };

  try {
    const result = await paymentService.createOrder(req, null);
    console.log('CREATE_ORDER_OK', JSON.stringify(result, null, 2));
  } catch (err) {
    console.error('CREATE_ORDER_FAIL', err.message);
    console.error(err.stack);
    if (err.cause) console.error('cause', err.cause);
  }
}

main();
