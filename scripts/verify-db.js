/**
 * Database health verification.
 * Usage: npm run verify:db
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');
const { writeJson, writeMarkdown, statusIcon, pct, table } = require('../verification/lib/report');
const { REQUIRED_TABLES, RBAC_TABLES } = require('../verification/lib/config');

const EXPECTED_ROLES = ['ADMIN', 'MANAGER', 'SALESPERSON', 'DELIVERY_AGENT'];
const EXPECTED_PERMISSIONS_MIN = 15;

async function main() {
  const config = getDbConfig();
  if (!config) {
    console.error('DB not configured');
    process.exit(1);
  }

  let conn;
  try {
    conn = await mysql.createConnection(config);
  } catch (err) {
    const msg = err.code === 'ECONNREFUSED' ? 'MySQL not running or wrong host/port' : err.message;
    writeJson('db', { pass: 0, total: 0, dbReachable: false, error: msg });
    writeMarkdown('DB_HEALTH_REPORT.md', [`# DB Health Report\n\n**DB connection failed:** ${msg}\n`]);
    console.error(`\n✗ verify:db — ${msg}`);
    process.exit(1);
  }

  const checks = [];

  try {
    const [tables] = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE()`
    );
    const tableSet = new Set(tables.map((t) => t.TABLE_NAME));

    for (const t of REQUIRED_TABLES) {
      const exists = tableSet.has(t);
      checks.push({ category: 'tables', name: t, pass: exists, detail: exists ? 'exists' : 'missing' });
    }

    for (const t of RBAC_TABLES) {
      const exists = tableSet.has(t);
      checks.push({ category: 'rbac', name: t, pass: exists, detail: exists ? 'exists' : 'missing' });
    }

    if (tableSet.has('roles')) {
      const [roles] = await conn.query('SELECT slug FROM roles');
      const slugs = roles.map((r) => r.slug);
      for (const slug of EXPECTED_ROLES) {
        checks.push({
          category: 'rbac_seed',
          name: `role:${slug}`,
          pass: slugs.includes(slug),
          detail: slugs.includes(slug) ? 'seeded' : 'missing',
        });
      }
    }

    if (tableSet.has('permissions')) {
      const [[{ cnt }]] = await conn.query('SELECT COUNT(*) AS cnt FROM permissions');
      checks.push({
        category: 'rbac_seed',
        name: 'permissions_count',
        pass: cnt >= EXPECTED_PERMISSIONS_MIN,
        detail: `${cnt} permissions`,
      });
    }

    if (tableSet.has('role_permissions')) {
      const [[{ cnt }]] = await conn.query('SELECT COUNT(*) AS cnt FROM role_permissions');
      checks.push({
        category: 'rbac_seed',
        name: 'role_permissions_links',
        pass: cnt >= EXPECTED_ROLES.length,
        detail: `${cnt} mappings`,
      });
    }

    const [fks] = await conn.query(
      `SELECT CONSTRAINT_NAME, TABLE_NAME, REFERENCED_TABLE_NAME
       FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL`
    );
    checks.push({
      category: 'foreign_keys',
      name: 'fk_count',
      pass: fks.length >= 3,
      detail: `${fks.length} foreign keys defined`,
    });

    const [indexes] = await conn.query(
      `SELECT COUNT(DISTINCT INDEX_NAME) AS cnt FROM INFORMATION_SCHEMA.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('audit_logs','notifications','stock_alerts')`
    );
    checks.push({
      category: 'indexes',
      name: 'phase2_indexes',
      pass: indexes[0].cnt >= 3,
      detail: `${indexes[0].cnt} indexes on audit/notification/alert tables`,
    });

    if (tableSet.has('audit_logs')) {
      checks.push({ category: 'audit', name: 'audit_logs_table', pass: true, detail: 'ready' });
    }
    if (tableSet.has('notifications')) {
      checks.push({ category: 'notifications', name: 'notifications_table', pass: true, detail: 'ready' });
    }
    if (tableSet.has('stock_alerts')) {
      checks.push({ category: 'stock_alerts', name: 'stock_alerts_table', pass: true, detail: 'ready' });
    }
  } finally {
    await conn.end();
  }

  const pass = checks.filter((c) => c.pass).length;
  const total = checks.length;
  const summary = { pass, total, coverage: pct(pass, total), checks };

  writeJson('db', summary);

  const md = [
    '# DB Health Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `**Overall:** ${statusIcon(pass === total)} ${pass}/${total} (${pct(pass, total)})`,
    '',
    table(
      ['Category', 'Check', 'Status', 'Detail'],
      checks.map((c) => [c.category, c.name, c.pass ? 'PASS' : 'FAIL', c.detail])
    ),
    '',
  ];
  writeMarkdown('DB_HEALTH_REPORT.md', md);
  console.log(`\n✓ verify:db — ${pass}/${total} checks passed`);
  console.log('  → DB_HEALTH_REPORT.md');
  process.exit(pass === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
