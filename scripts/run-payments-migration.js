/**
 * Run payments schema migration (002) against configured MySQL.
 * Usage: npm run migrate:payments
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');

async function main() {
  const config = getDbConfig();
  if (!config) {
    console.error('Database not configured');
    process.exit(1);
  }
  const sql = fs.readFileSync(
    path.join(__dirname, '..', 'migrations', '002-payments-schema.sql'),
    'utf8'
  );
  const statements = sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s && !s.startsWith('--'));

  const conn = await mysql.createConnection(config);
  try {
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
        console.log('OK:', stmt.slice(0, 60).replace(/\s+/g, ' ') + '...');
      } catch (err) {
        if (['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 'ER_TABLE_EXISTS_ERROR'].includes(err.code)) {
          console.warn('SKIP (exists):', err.message);
        } else {
          throw err;
        }
      }
    }
    console.log('Payments migration completed.');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
