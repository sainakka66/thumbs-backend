/**
 * End-to-end business flow scenarios.
 * Usage: npm run verify:e2e
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');
const { request, login, healthCheck } = require('../verification/lib/http');
const { writeJson, writeMarkdown, statusIcon, pct, table } = require('../verification/lib/report');
const { TEST_USERS, API_BASE } = require('../verification/lib/config');

async function scenario(name, steps) {
  const log = [];
  let pass = true;
  for (const step of steps) {
    try {
      const ok = await step();
      log.push({ step: step.name || 'step', pass: ok, detail: ok ? 'ok' : 'failed' });
      if (!ok) pass = false;
    } catch (e) {
      log.push({ step: step.name || 'step', pass: false, detail: e.message });
      pass = false;
    }
  }
  return { name, pass, log };
}

async function main() {
  if (!(await healthCheck())) {
    writeMarkdown('E2E_FLOW_REPORT.md', `# E2E Flow Report\n\nAPI unreachable at ${API_BASE}\n`);
    process.exit(1);
  }

  const config = getDbConfig();
  const conn = await mysql.createConnection(config);
  const scenarios = [];
  const ts = Date.now();

  try {
    let adminToken;
    let customerId;
    let productName;

    // Scenario 1 — ADMIN
    scenarios.push(
      await scenario('ADMIN: login → customer → inventory → sale → invoice PDF', [
        async function loginStep() {
          const lr = await login(TEST_USERS.ADMIN.username, TEST_USERS.ADMIN.password);
          adminToken = lr.token;
          return lr.success;
        },
        async function customerStep() {
          const res = await request('POST', '/customers', {
            token: adminToken,
            body: {
              shop_name: `E2E Admin ${ts}`,
              owner_name: 'E2E',
              phone: '9000000001',
              credit_limit: 0,
              opening_balance: 0,
            },
          });
          customerId = res.data?.id;
          return res.ok && customerId;
        },
        async function inventoryStep() {
          const res = await request('POST', '/products', {
            token: adminToken,
            body: {
              Name: `E2E Product ${ts}`,
              quantity: 100,
              price: 200,
              sku: `E2E-${ts}`,
              reorder: 10,
              bpc: 24,
            },
          });
          productName = `E2E Product ${ts}`;
          return res.ok;
        },
        async function saleStep() {
          const res = await request('POST', '/sales', {
            token: adminToken,
            body: {
              customer_id: customerId,
              product_name: productName,
              quantity: 2,
              price_per_case: 200,
              total_amount: 400,
              amount_paid: 400,
              payment_mode: 'cash',
            },
          });
          return res.ok;
        },
        async function invoiceStep() {
          const [sales] = await conn.query(
            'SELECT id FROM sales WHERE customer_id = ? ORDER BY id DESC LIMIT 1',
            [scenario._customerId]
          );
          if (!sales.length) return false;
          const res = await request('GET', `/pdf/sales-invoice/${sales[0].id}`, {
            token: adminToken,
          });
          return res.status === 200;
        },
      ])
    );

    let mgrToken;
    let mgrCust;

    // Scenario 2 — MANAGER
    scenarios.push(
      await scenario('MANAGER: login → customer → sale', [
        async function loginStep() {
          const lr = await login(TEST_USERS.MANAGER.username, TEST_USERS.MANAGER.password);
          mgrToken = lr.token;
          return lr.success;
        },
        async function customerStep() {
          const res = await request('POST', '/customers', {
            token: mgrToken,
            body: {
              shop_name: `E2E Mgr ${ts}`,
              owner_name: 'Mgr',
              phone: '9000000002',
              credit_limit: 0,
              opening_balance: 0,
            },
          });
          mgrCust = res.data?.id;
          return res.ok;
        },
        async function saleStep() {
          if (!mgrCust) return false;
          const res = await request('POST', '/sales', {
            token: mgrToken,
            body: {
              customer_id: mgrCust,
              product_name: productName || 'E2E Product',
              quantity: 1,
              price_per_case: 100,
              total_amount: 100,
              amount_paid: 50,
              payment_mode: 'credit',
            },
          });
          return res.ok;
        },
      ])
    );

    let salesToken;

    // Scenario 3 — SALESPERSON
    scenarios.push(
      await scenario('SALESPERSON: login → create sale', [
        async function loginStep() {
          const lr = await login(TEST_USERS.SALESPERSON.username, TEST_USERS.SALESPERSON.password);
          salesToken = lr.token;
          return lr.success;
        },
        async function saleStep() {
          const [cust] = await conn.query('SELECT id FROM customers ORDER BY id DESC LIMIT 1');
          if (!cust.length) return false;
          const res = await request('POST', '/sales', {
            token: salesToken,
            body: {
              customer_id: cust[0].id,
              product_name: productName || 'E2E Product',
              quantity: 1,
              price_per_case: 50,
              total_amount: 50,
              amount_paid: 50,
              payment_mode: 'cash',
            },
          });
          return res.ok;
        },
      ])
    );

    // Scenario 4 — DELIVERY_AGENT
    const [[deliveryUser]] = await conn.query('SELECT id FROM users WHERE username = ?', [
      TEST_USERS.DELIVERY_AGENT.username,
    ]);
    let deliveryId = null;
    const [cust] = await conn.query('SELECT id FROM customers ORDER BY id DESC LIMIT 1');
    if (cust.length && deliveryUser) {
      try {
        const [ins] = await conn.query(
          `INSERT INTO deliveries (customer_id, assigned_user_id, product_name, quantity, status, delivery_date)
           VALUES (?, ?, 'E2E Delivery', 5, 'Pending', CURDATE())`,
          [cust[0].id, deliveryUser.id]
        );
        deliveryId = ins.insertId;
      } catch (e) {
        if (e.code === 'ER_BAD_FIELD_ERROR') {
          const [ins] = await conn.query(
            `INSERT INTO deliveries (customer_id, product_name, quantity, status, delivery_date)
             VALUES (?, 'E2E Delivery', 5, 'Pending', CURDATE())`,
            [cust[0].id]
          );
          deliveryId = ins.insertId;
        }
      }
    }

    let delToken;

    scenarios.push(
      await scenario('DELIVERY_AGENT: login → view delivery → update status', [
        async function loginStep() {
          const lr = await login(TEST_USERS.DELIVERY_AGENT.username, TEST_USERS.DELIVERY_AGENT.password);
          delToken = lr.token;
          return lr.success;
        },
        async function viewStep() {
          const res = await request('GET', '/deliveries', { token: delToken });
          return res.ok && Array.isArray(res.data);
        },
        async function updateStep() {
          if (!deliveryId) return false;
          const res = await request('PUT', `/deliveries/${deliveryId}`, {
            token: delToken,
            body: { status: 'Completed' },
          });
          return res.ok;
        },
      ])
    );
  } finally {
    await conn.end();
  }

  const pass = scenarios.filter((s) => s.pass).length;
  const total = scenarios.length;
  writeJson('e2e', { pass, total, scenarios });

  const lines = [
    '# E2E Flow Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `**Overall:** ${statusIcon(pass === total)} ${pass}/${total} scenarios`,
    '',
  ];

  for (const s of scenarios) {
    lines.push(`## ${s.name}`, '', s.pass ? '**PASS**' : '**FAIL**', '');
    lines.push(
      table(
        ['Step', 'Result', 'Detail'],
        s.log.map((l) => [l.step, l.pass ? 'PASS' : 'FAIL', l.detail])
      )
    );
    lines.push('');
  }

  writeMarkdown('E2E_FLOW_REPORT.md', lines);
  console.log(`\n✓ verify:e2e — ${pass}/${total} scenarios`);
  process.exit(pass === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
