/**
 * Run security hardening migration (003) against configured MySQL.
 * Usage: npm run migrate:security
 */
require('dotenv').config();
const path = require('path');
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
      path.join(__dirname, '..', 'migrations', '003-security-hardening.sql'),
      'Security migration 003'
    );
    console.log('\n✓ migrate:security SUCCESS');
    console.log(`  Applied: ${result.ok}/${result.total} statements`);
    process.exit(0);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('\n✗ migrate:security FAILED');
  console.error(err.message || err);
  if (err.code) console.error('MySQL code:', err.code);
  process.exit(1);
});
