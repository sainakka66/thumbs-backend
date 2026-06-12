/**
 * Run payment ledger platform migration (012).
 * Usage: npm run migrate:ledger
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.railway'), override: true });
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');
const { runMigrationFile } = require('./lib/mysql-migrate');

async function main() {
  const config = getDbConfig();
  if (!config) {
    console.error('Database not configured. Set DB_HOST, DB_USER, DB_NAME, DB_PASSWORD in .env');
    process.exit(1);
  }

  const conn = await mysql.createConnection(config);
  try {
    const result = await runMigrationFile(
      conn,
      path.join(__dirname, '..', 'migrations', '012-payment-ledger-platform.sql'),
      'Payment ledger platform migration 012'
    );
    console.log('\n✓ migrate:ledger SUCCESS');
    console.log(`  Applied: ${result.ok}/${result.total} statements`);
    process.exit(0);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('\n✗ migrate:ledger FAILED');
  console.error(err.message || err);
  if (err.code) console.error('MySQL code:', err.code);
  process.exit(1);
});
