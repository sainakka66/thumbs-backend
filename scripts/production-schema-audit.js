/**
 * Production schema audit — compares Railway DB to roadmap migrations 008–010.
 * Usage: set MYSQL_URL or MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE/MYSQLPORT, then:
 *   node scripts/production-schema-audit.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');

const REQUIRED_TABLES = [
  'user_mfa_settings',
  'user_mfa_backup_codes',
  'user_mfa_email_otp',
  'login_attempts',
  'account_lockouts',
  'security_audit_events',
  'collections',
  'payment_reconciliations',
  'feature_flags',
  'suppliers',
  'purchase_orders',
  'stock_inward',
  'supplier_ledger',
  'warehouse_transfers',
  'supplier_payments',
  'user_email_verification',
];

const REQUIRED_COLUMNS = {
  users: ['mfa_enabled', 'mfa_enforced', 'email_verified', 'email_verified_at'],
  trusted_devices: [
    'device_label',
    'browser_name',
    'os_name',
    'ip_address',
    'is_verified',
    'verified_at',
    'last_login_at',
  ],
  user_sessions: [
    'browser_name',
    'os_name',
    'device_label',
    'is_trusted',
    'revoked_at',
    'revoke_reason',
  ],
};

const REQUIRED_INDEXES = [
  { table: 'login_attempts', index: 'idx_login_attempts_user' },
  { table: 'login_attempts', index: 'idx_login_attempts_ip' },
  { table: 'user_mfa_email_otp', index: 'idx_mfa_email_user_exp' },
  { table: 'collections', index: 'idx_collections_customer' },
  { table: 'suppliers', index: 'uk_suppliers_code' },
];

async function main() {
  const config = getDbConfig();
  if (!config) {
    console.error('BLOCKED: No database config (set MYSQL_URL or MYSQL* vars).');
    process.exit(2);
  }

  const conn = await mysql.createConnection(config);
  try {
    const [[{ db }]] = await conn.query('SELECT DATABASE() AS db');
    const [[{ ver }]] = await conn.query('SELECT VERSION() AS ver');
    const [[{ userCount }]] = await conn.query('SELECT COUNT(*) AS userCount FROM users');

    console.log('=== Production DB Target ===');
    console.log(JSON.stringify({
      host: config.host,
      port: config.port,
      database: db,
      user: config.user,
      ssl: Boolean(config.ssl),
      mysqlVersion: ver,
      usersRowCount: userCount,
    }, null, 2));

    const [tables] = await conn.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
      [db]
    );
    const existingTables = new Set(tables.map((r) => r.TABLE_NAME));

    const missingTables = REQUIRED_TABLES.filter((t) => !existingTables.has(t));
    console.log('\n=== Missing Tables ===');
    console.log(missingTables.length ? missingTables.join('\n') : '(none)');

    const missingColumns = [];
    for (const [table, cols] of Object.entries(REQUIRED_COLUMNS)) {
      if (!existingTables.has(table)) {
        for (const col of cols) missingColumns.push({ table, column: col, reason: 'table_missing' });
        continue;
      }
      const [rows] = await conn.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
        [db, table]
      );
      const have = new Set(rows.map((r) => r.COLUMN_NAME));
      for (const col of cols) {
        if (!have.has(col)) missingColumns.push({ table, column: col, reason: 'column_missing' });
      }
    }
    console.log('\n=== Missing Columns ===');
    if (!missingColumns.length) console.log('(none)');
    else console.log(JSON.stringify(missingColumns, null, 2));

    const missingIndexes = [];
    for (const { table, index } of REQUIRED_INDEXES) {
      if (!existingTables.has(table)) {
        missingIndexes.push({ table, index, reason: 'table_missing' });
        continue;
      }
      const [rows] = await conn.query(
        `SELECT 1 AS ok FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND INDEX_NAME = ? LIMIT 1`,
        [db, table, index]
      );
      if (!rows.length) missingIndexes.push({ table, index, reason: 'index_missing' });
    }
    console.log('\n=== Missing Indexes ===');
    if (!missingIndexes.length) console.log('(none)');
    else console.log(JSON.stringify(missingIndexes, null, 2));

    const needsMigration =
      missingTables.length > 0 ||
      missingColumns.length > 0 ||
      missingIndexes.length > 0;
    console.log('\n=== Audit Summary ===');
    console.log(needsMigration ? 'MIGRATIONS_REQUIRED' : 'SCHEMA_OK');
    process.exit(needsMigration ? 1 : 0);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('AUDIT_FAILED:', err.message);
  process.exit(3);
});
