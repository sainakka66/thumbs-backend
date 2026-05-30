/**
 * Run performance indexes migration (007).
 * Usage: npm run migrate:performance
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
      path.join(__dirname, '..', 'migrations', '007-performance-indexes.sql'),
      'Performance migration 007'
    );
    console.log('\n\u2713 migrate:performance SUCCESS');
    console.log(`  Applied: ${result.ok}/${result.total} statements (${result.skipped} skipped)`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('\n\u2717 migrate:performance FAILED');
  console.error(err.message || err);
  process.exit(1);
});
