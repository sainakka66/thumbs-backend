const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.railway'), override: true });
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');
const { runMigrationFile } = require('./lib/mysql-migrate');

async function main() {
  const conn = await mysql.createConnection(getDbConfig());
  try {
    const result = await runMigrationFile(
      conn,
      path.join(__dirname, '..', 'migrations', '016-timeline-event-source.sql'),
      'Timeline event_source fix 016'
    );
    console.log(`Applied ${result.ok}/${result.total}`);
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
