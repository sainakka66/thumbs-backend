/**
 * Run enterprise roles/users migration (006).
 * Usage: npm run migrate:enterprise
 */
require('dotenv').config();
const path = require('path');
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');
const { runMigrationFile } = require('./lib/mysql-migrate');

async function main() {
  const config = getDbConfig();
  if (!config) {
    console.error('Database not configured.');
    process.exit(1);
  }
  const conn = await mysql.createConnection(config);
  try {
    const result = await runMigrationFile(
      conn,
      path.join(__dirname, '..', 'migrations', '006-enterprise-roles-users.sql'),
      'Enterprise migration 006'
    );
    console.log('\n✓ migrate:enterprise SUCCESS');
    console.log(`  Applied: ${result.ok}/${result.total} statements`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('\n✗ migrate:enterprise FAILED');
  console.error(err.message || err);
  process.exit(1);
});
