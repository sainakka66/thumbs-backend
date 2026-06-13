/**
 * Set a known password for proof test user on Railway.
 * Usage: PROOF_PASSWORD='Tu!Proof2026' node scripts/set-proof-password.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.railway'), override: true });
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');

const USERNAME = process.env.PROOF_USERNAME || 'sales_sai';
const PASSWORD = process.env.PROOF_PASSWORD || 'Tu!Proof2026x';

async function main() {
  const config = getDbConfig();
  if (!config) process.exit(1);
  const conn = await mysql.createConnection(config);
  const hash = await bcrypt.hash(PASSWORD, 12);
  const [r] = await conn.query('UPDATE users SET password = ? WHERE username = ?', [hash, USERNAME]);
  console.log(`Updated ${USERNAME}: affected=${r.affectedRows}`);
  console.log(`Use PROOF_PASSWORD=${PASSWORD} for e2e scripts`);
  await conn.end();
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
