/**
 * Run rate limit config migration (005).
 * Usage: npm run migrate:ratelimit
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
      path.join(__dirname, '..', 'migrations', '005-rate-limit-config.sql'),
      'Rate limit migration 005'
    );
    console.log('\n✓ migrate:ratelimit SUCCESS');
    console.log(`  Applied: ${result.ok}/${result.total} statements`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('\n✗ migrate:ratelimit FAILED');
  console.error(err.message || err);
  process.exit(1);
});
