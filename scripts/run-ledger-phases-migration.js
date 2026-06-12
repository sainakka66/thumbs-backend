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
      path.join(__dirname, '..', 'migrations', '013-ledger-phases-5-10.sql'),
      'Ledger phases 5-10 migration 013'
    );
    console.log('\n✓ migrate:ledger-phases SUCCESS');
    console.log(`  Applied: ${result.ok}/${result.total} statements`);
    process.exit(0);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('\n✗ migrate:ledger-phases FAILED');
  console.error(err.message || err);
  process.exit(1);
});
