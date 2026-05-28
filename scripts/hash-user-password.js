/**
 * Hash a user's password with bcrypt (run once per user after deploy).
 *
 * Usage:
 *   node scripts/hash-user-password.js --username admin
 *   ADMIN_NEW_PASSWORD='YourStr0ng!Pass' node scripts/hash-user-password.js --username admin
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const readline = require('readline');
const {
  getDbConfig,
  validatePassword,
} = require('../config');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

function parseArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1 || !process.argv[idx + 1]) return null;
  return process.argv[idx + 1];
}

function promptHidden(question) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const username = parseArg('--username');
  if (!username) {
    console.error('Usage: node scripts/hash-user-password.js --username <name>');
    process.exit(1);
  }

  let password = process.env.ADMIN_NEW_PASSWORD;
  if (!password) {
    password = await promptHidden('New password: ');
    const confirm = await promptHidden('Confirm password: ');
    if (password !== confirm) {
      console.error('Passwords do not match.');
      process.exit(1);
    }
  }

  const policyError = validatePassword(password);
  if (policyError) {
    console.error(policyError);
    process.exit(1);
  }

  const dbConfig = getDbConfig();
  if (!dbConfig) {
    console.error('Database not configured. Set DATABASE_URL or MYSQL* env vars.');
    process.exit(1);
  }

  const pool = mysql.createPool({ ...dbConfig, connectionLimit: 1 });
  try {
    const [rows] = await pool.query('SELECT id FROM users WHERE username = ?', [username]);
    if (!rows.length) {
      console.error(`User not found: ${username}`);
      process.exit(1);
    }

    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    await pool.query('UPDATE users SET password = ? WHERE username = ?', [hash, username]);
    console.log(`Password hashed for user "${username}".`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
