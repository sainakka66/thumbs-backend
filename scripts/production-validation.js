/**
 * Production recovery validation — health, RBAC, DB integrity, payment path checks.
 * Usage: node scripts/production-validation.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.railway'), override: true });
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');

const BACKEND_URL = process.env.BACKEND_URL || 'https://thumbs-backend.onrender.com';

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { Accept: 'application/json', ...(opts.headers || {}) } });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body };
}

async function main() {
  const report = { checks: [], verdict: 'NOT READY' };
  const config = getDbConfig();
  let conn;

  // Health
  for (const path of ['/health', '/payments/ops/health']) {
    const { status, body } = await fetchJson(`${BACKEND_URL}${path}`);
    report.checks.push({
      name: `HTTP ${path}`,
      ok: status === 200,
      status,
      detail: body?.status || body?.healthy || body?.message,
    });
  }

  // Login 401
  const badLogin = await fetchJson(`${BACKEND_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'invalid_user_xyz', password: 'wrong' }),
  });
  report.checks.push({
    name: 'Login bad credentials returns 401',
    ok: badLogin.status === 401,
    status: badLogin.status,
  });

  if (!config) {
    report.checks.push({ name: 'Database config', ok: false, detail: 'missing' });
    printReport(report);
    process.exit(1);
  }

  conn = await mysql.createConnection(config);

  // Schema: payment_domain_audit_logs
  const [auditTable] = await conn.query(
    `SELECT COUNT(*) AS c FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payment_domain_audit_logs'`
  );
  report.checks.push({
    name: 'payment_domain_audit_logs table',
    ok: auditTable[0].c > 0,
  });

  // RBAC: SALESPERSON payments.create
  const [rbacRows] = await conn.query(
    `SELECT r.slug, p.slug AS perm FROM role_permissions rp
     JOIN roles r ON r.id = rp.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE r.slug IN ('SALESPERSON','MANAGER','ADMIN','FINANCE','SUPER_ADMIN')
       AND p.slug LIKE 'payments.%'
     ORDER BY r.slug, p.slug`
  );
  const rbacByRole = {};
  for (const row of rbacRows) {
    rbacByRole[row.slug] = rbacByRole[row.slug] || [];
    rbacByRole[row.slug].push(row.perm);
  }
  report.rbacMatrix = rbacByRole;
  report.checks.push({
    name: 'SALESPERSON has payments.create',
    ok: (rbacByRole.SALESPERSON || []).includes('payments.create'),
  });
  report.checks.push({
    name: 'MANAGER has payments.create',
    ok: (rbacByRole.MANAGER || []).includes('payments.create'),
  });

  // DB integrity
  const integrityQueries = [
    ['orphan_ledger_entries', `SELECT COUNT(*) AS c FROM ledger_entries le
      LEFT JOIN payment_orders po ON po.id = le.payment_order_id
      WHERE le.payment_order_id IS NOT NULL AND po.id IS NULL`],
    ['duplicate_payment_events', `SELECT COUNT(*) AS c FROM (
      SELECT idempotency_key FROM payment_events GROUP BY idempotency_key HAVING COUNT(*) > 1
    ) d`],
    ['stuck_orders', `SELECT COUNT(*) AS c FROM payment_orders
      WHERE status IN ('INITIATED','PENDING','CREATED') AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY)`],
    ['webhook_events', `SELECT COUNT(*) AS c FROM webhook_events`],
    ['ledger_entries', `SELECT COUNT(*) AS c FROM ledger_entries`],
    ['payment_domain_audit', `SELECT COUNT(*) AS c FROM payment_domain_audit_logs`],
    ['settlement_collections_link', `SELECT COUNT(*) AS c FROM collections WHERE payment_order_id IS NOT NULL`],
  ];

  for (const [name, sql] of integrityQueries) {
    try {
      const [rows] = await conn.query(sql);
      const c = rows[0]?.c ?? 0;
      report.checks.push({
        name: `db:${name}`,
        ok: name.startsWith('duplicate') || name.startsWith('orphan') || name === 'stuck_orders' ? c === 0 : true,
        count: c,
      });
    } catch (err) {
      report.checks.push({ name: `db:${name}`, ok: false, error: err.message });
    }
  }

  // Razorpay config (local env check — production keys on Render not readable here)
  const hasRazorpayLocal = Boolean(
    process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET
  );
  report.checks.push({
    name: 'Razorpay env vars present (local/railway env file)',
    ok: hasRazorpayLocal,
    detail: hasRazorpayLocal ? 'configured' : 'missing — required on Render for live payments',
  });

  const paymentProof =
    report.checks.find((c) => c.name === 'db:webhook_events')?.count > 0 &&
    report.checks.find((c) => c.name === 'db:ledger_entries')?.count > 0;

  report.checks.push({
    name: 'E2E payment proof (webhook + ledger in DB)',
    ok: paymentProof,
    detail: paymentProof ? 'records exist' : 'no completed payment chain in DB yet',
  });

  const failed = report.checks.filter((c) => !c.ok);
  const criticalFailed = failed.filter(
    (c) =>
      !c.name.includes('Razorpay env') &&
      !c.name.includes('E2E payment proof') &&
      !c.name.includes('Login bad credentials')
  );

  if (criticalFailed.length === 0 && paymentProof && badLogin.status === 401) {
    report.verdict = 'PRODUCTION READY';
  } else if (criticalFailed.length === 0) {
    report.verdict = 'PARTIALLY READY';
  } else {
    report.verdict = 'NOT READY';
  }

  printReport(report);
  await conn.end();
  process.exit(report.verdict === 'PRODUCTION READY' ? 0 : 1);
}

function printReport(report) {
  console.log('\n=== PRODUCTION VALIDATION REPORT ===\n');
  for (const c of report.checks) {
    console.log(`${c.ok ? '✓' : '✗'} ${c.name}${c.status ? ` [${c.status}]` : ''}${c.count != null ? ` (count=${c.count})` : ''}${c.detail ? ` — ${c.detail}` : ''}`);
  }
  if (report.rbacMatrix) {
    console.log('\n--- RBAC Matrix (payments.*) ---');
    for (const [role, perms] of Object.entries(report.rbacMatrix)) {
      console.log(`${role}: ${perms.join(', ')}`);
    }
  }
  console.log(`\nVERDICT: ${report.verdict}\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
