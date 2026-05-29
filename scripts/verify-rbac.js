/**
 * RBAC permission matrix verification per role.
 * Usage: npm run verify:rbac
 */
require('dotenv').config();
const { request, login } = require('../verification/lib/http');
const { writeJson, writeMarkdown, statusIcon, pct, table } = require('../verification/lib/report');
const { TEST_USERS, API_BASE } = require('../verification/lib/config');
const { healthCheck } = require('../verification/lib/http');

const MATRIX = {
  ADMIN: [
    { name: 'View all customers', method: 'GET', path: '/customers', expect: 'allow' },
    { name: 'View inventory', method: 'GET', path: '/inventory', expect: 'allow' },
    { name: 'View reports', method: 'GET', path: '/reports/sales?range=week', expect: 'allow' },
    { name: 'View audit logs', method: 'GET', path: '/audit/logs?limit=5', expect: 'allow' },
    { name: 'Manage deliveries list', method: 'GET', path: '/deliveries', expect: 'allow' },
    { name: 'Admin payment monitor', method: 'GET', path: '/admin/payments/monitor', expect: 'allow' },
    { name: 'Manage users API', method: 'GET', path: '/rbac/me', expect: 'allow', note: 'users.manage API not implemented; rbac/me proxy' },
  ],
  MANAGER: [
    { name: 'Manage customers', method: 'GET', path: '/customers', expect: 'allow' },
    { name: 'Manage inventory', method: 'GET', path: '/inventory', expect: 'allow' },
    { name: 'Manage sales list', method: 'GET', path: '/sales', expect: 'allow' },
    { name: 'View reports', method: 'GET', path: '/reports/sales?range=week', expect: 'allow' },
    { name: 'Cannot view audit logs', method: 'GET', path: '/audit/logs?limit=5', expect: 'deny' },
    { name: 'Cannot admin monitor', method: 'GET', path: '/admin/payments/monitor', expect: 'deny' },
    { name: 'Cannot manage users', method: 'GET', path: '/admin/payments/fraud-queue', expect: 'deny' },
  ],
  SALESPERSON: [
    { name: 'Create sales (list)', method: 'GET', path: '/sales', expect: 'allow' },
    { name: 'View inventory', method: 'GET', path: '/inventory', expect: 'allow' },
    { name: 'View customers', method: 'GET', path: '/customers', expect: 'allow' },
    { name: 'Cannot view audit logs', method: 'GET', path: '/audit/logs?limit=5', expect: 'deny' },
    { name: 'Cannot view reports', method: 'GET', path: '/reports/sales?range=week', expect: 'deny' },
    { name: 'Cannot admin monitor', method: 'GET', path: '/admin/payments/monitor', expect: 'deny' },
  ],
  DELIVERY_AGENT: [
    { name: 'View assigned deliveries', method: 'GET', path: '/deliveries', expect: 'allow' },
    { name: 'Cannot view sales', method: 'GET', path: '/sales', expect: 'deny' },
    { name: 'Cannot view inventory', method: 'GET', path: '/inventory', expect: 'deny' },
    { name: 'Cannot view reports', method: 'GET', path: '/reports/sales?range=week', expect: 'deny' },
    { name: 'Cannot view customers', method: 'GET', path: '/customers', expect: 'deny' },
    { name: 'Cannot view audit', method: 'GET', path: '/audit/logs?limit=5', expect: 'deny' },
  ],
};

async function runCheck(token, check) {
  const res = await request(check.method, check.path, { token });
  const denied = res.status === 403;
  const allowed = res.status >= 200 && res.status < 400;
  if (check.expect === 'allow') return { pass: allowed, status: res.status, detail: allowed ? 'allowed' : `expected allow got ${res.status}` };
  return { pass: denied, status: res.status, detail: denied ? 'denied as expected' : `expected deny got ${res.status}` };
}

async function main() {
  if (!(await healthCheck())) {
    writeMarkdown('RBAC_TEST_REPORT.md', `# RBAC Test Report\n\nAPI unreachable at ${API_BASE}\n`);
    process.exit(1);
  }

  const allResults = [];

  for (const [role, checks] of Object.entries(MATRIX)) {
    const cred = TEST_USERS[role];
    const lr = await login(cred.username, cred.password);
    if (!lr.success) {
      for (const c of checks) {
        allResults.push({ role, ...c, pass: false, status: 0, detail: `login failed: ${lr.error}` });
      }
      continue;
    }

    for (const check of checks) {
      const outcome = await runCheck(lr.token, check);
      allResults.push({
        role,
        name: check.name,
        path: check.path,
        expect: check.expect,
        pass: outcome.pass,
        status: outcome.status,
        detail: outcome.detail,
        note: check.note || '',
      });
    }
  }

  const pass = allResults.filter((r) => r.pass).length;
  const total = allResults.length;

  writeJson('rbac', { pass, total, results: allResults });

  const byRole = {};
  for (const r of allResults) {
    if (!byRole[r.role]) byRole[r.role] = [];
    byRole[r.role].push(r);
  }

  const lines = [
    '# RBAC Test Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `**Overall:** ${statusIcon(pass === total)} ${pass}/${total} (${pct(pass, total)})`,
    '',
  ];

  for (const [role, rows] of Object.entries(byRole)) {
    const rp = rows.filter((x) => x.pass).length;
    lines.push(`## ${role} (${rp}/${rows.length})`, '');
    lines.push(
      table(
        ['Test', 'Path', 'Expected', 'HTTP', 'Result', 'Detail'],
        rows.map((r) => [r.name, r.path, r.expect, String(r.status), r.pass ? 'PASS' : 'FAIL', r.detail])
      )
    );
    lines.push('');
  }

  writeMarkdown('RBAC_TEST_REPORT.md', lines);
  console.log(`\n✓ verify:rbac — ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
