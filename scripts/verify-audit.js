/**
 * Audit log verification — performs actions and checks audit_logs rows.
 * Usage: npm run verify:audit
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');
const { request, login, healthCheck } = require('../verification/lib/http');
const { writeJson, writeMarkdown, statusIcon, pct, table } = require('../verification/lib/report');
const { TEST_USERS, API_BASE } = require('../verification/lib/config');

const EXPECTED_ACTIONS = ['login', 'logout', 'customer_create', 'customer_update', 'sale_create', 'inventory_update'];

async function countAudit(conn, action, userId, since) {
  try {
    const [rows] = await conn.query(
      `SELECT COUNT(*) AS cnt FROM audit_logs WHERE action = ? AND user_id = ? AND created_at >= ?`,
      [action, userId, since]
    );
    return rows[0].cnt;
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') return -1;
    throw e;
  }
}

async function main() {
  if (!(await healthCheck())) {
    writeMarkdown('AUDIT_VERIFICATION_REPORT.md', `# Audit Verification\n\nAPI unreachable at ${API_BASE}\n`);
    process.exit(1);
  }

  const config = getDbConfig();
  const conn = await mysql.createConnection(config);
  const since = new Date(Date.now() - 5 * 60 * 1000);
  const results = [];

  try {
    const admin = TEST_USERS.ADMIN;
    const lr = await login(admin.username, admin.password);
    if (!lr.success) {
      throw new Error(`Admin login failed: ${lr.error}`);
    }

    const [[user]] = await conn.query('SELECT id FROM users WHERE username = ?', [admin.username]);
    const userId = user?.id;

    // login audit (from login handler)
    await new Promise((r) => setTimeout(r, 300));
    let cnt = await countAudit(conn, 'login', userId, since);
    results.push({ action: 'login', pass: cnt > 0, detail: `${cnt} row(s)`, automated: true });

    // logout
    await request('POST', '/logout', { token: lr.token });
    cnt = await countAudit(conn, 'logout', userId, since);
    results.push({ action: 'logout', pass: cnt > 0, detail: `${cnt} row(s)`, automated: true });

    const lr2 = await login(admin.username, admin.password);

    const custBody = {
      shop_name: `Audit Shop ${Date.now()}`,
      owner_name: 'Audit Test',
      phone: '9999999999',
      email: 'audit@test.local',
      address: 'Test',
      area: 'Test',
      credit_limit: 0,
      opening_balance: 0,
    };
    const createCust = await request('POST', '/customers', { token: lr2.token, body: custBody });
    const customerId = createCust.data?.id;
    await new Promise((r) => setTimeout(r, 300));
    cnt = await countAudit(conn, 'customer_create', userId, since);
    results.push({
      action: 'customer_create',
      pass: cnt > 0 && createCust.ok,
      detail: `audit=${cnt}, api=${createCust.status}`,
      automated: true,
    });

    if (customerId) {
      const upd = await request('PUT', `/customers/${customerId}`, {
        token: lr2.token,
        body: { ...custBody, shop_name: custBody.shop_name + ' Updated' },
      });
      await new Promise((r) => setTimeout(r, 300));
      cnt = await countAudit(conn, 'customer_update', userId, since);
      results.push({
        action: 'customer_update',
        pass: cnt > 0 && upd.ok,
        detail: `audit=${cnt}, api=${upd.status}`,
        automated: true,
      });
    } else {
      results.push({ action: 'customer_update', pass: false, detail: 'no customer id', automated: true });
    }

    const invBody = {
      Name: `AuditProduct${Date.now()}`,
      quantity: 50,
      price: 100,
      sku: `SKU-AUD-${Date.now()}`,
      category: 'Test',
      size: 'M',
      bpc: 24,
      reorder: 10,
    };
    const createInv = await request('POST', '/products', { token: lr2.token, body: invBody });
    await new Promise((r) => setTimeout(r, 300));
    cnt = await countAudit(conn, 'inventory_create', userId, since);
    results.push({
      action: 'inventory_create',
      pass: cnt > 0 && createInv.ok,
      detail: `audit=${cnt}, api=${createInv.status}`,
      automated: true,
    });

    if (createInv.data?.id) {
      const updInv = await request('PUT', `/products/${createInv.data.id}`, {
        token: lr2.token,
        body: { ...invBody, quantity: 45 },
      });
      await new Promise((r) => setTimeout(r, 300));
      cnt = await countAudit(conn, 'inventory_update', userId, since);
      results.push({
        action: 'inventory_update',
        pass: cnt > 0 && updInv.ok,
        detail: `audit=${cnt}, api=${updInv.status}`,
        automated: true,
      });
    }

    if (customerId) {
      const saleBody = {
        customer_id: customerId,
        product_name: invBody.Name,
        quantity: 1,
        price_per_case: 100,
        total_amount: 100,
        amount_paid: 100,
        payment_mode: 'cash',
        notes: 'audit test',
      };
      const sale = await request('POST', '/sales', { token: lr2.token, body: saleBody });
      await new Promise((r) => setTimeout(r, 300));
      cnt = await countAudit(conn, 'sale_create', userId, since);
      results.push({
        action: 'sale_create',
        pass: cnt > 0 && sale.ok,
        detail: `audit=${cnt}, api=${sale.status}`,
        automated: true,
      });
    } else {
      results.push({ action: 'sale_create', pass: false, detail: 'skipped no customer', automated: true });
    }

    for (const action of EXPECTED_ACTIONS) {
      if (!results.find((r) => r.action === action)) {
        results.push({ action, pass: false, detail: 'not tested', automated: false });
      }
    }
  } finally {
    await conn.end();
  }

  const pass = results.filter((r) => r.pass).length;
  const total = results.length;
  writeJson('audit', { pass, total, results });

  writeMarkdown('AUDIT_VERIFICATION_REPORT.md', [
    '# Audit Verification Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `**Overall:** ${statusIcon(pass === total)} ${pass}/${total} (${pct(pass, total)})`,
    '',
    table(
      ['Action', 'Automated', 'Result', 'Detail'],
      results.map((r) => [r.action, r.automated ? 'yes' : 'no', r.pass ? 'PASS' : 'FAIL', r.detail])
    ),
    '',
  ]);

  console.log(`\n✓ verify:audit — ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
