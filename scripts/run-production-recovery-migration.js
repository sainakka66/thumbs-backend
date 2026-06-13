const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.railway'), override: true });
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
      path.join(__dirname, '..', 'migrations', '015-production-recovery.sql'),
      'Production recovery migration 015'
    );
    console.log('\n✓ migrate:production-recovery SUCCESS');
    console.log(`  Applied: ${result.ok}/${result.total} statements`);
    process.exit(0);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('\n✗ migrate:production-recovery FAILED');
  console.error(err.message || err);
  process.exit(1);
});
