/**
 * Seed enterprise RBAC test users with generated secure passwords.
 * Usage: npm run seed:enterprise
 */
require('dotenv').config();
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const { getDbConfig, isUsernameDisabled } = require('../config');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

function securePassword() {
  const base = crypto.randomBytes(12).toString('base64url');
  return `Tu!${base}9`;
}

const USERS = [
  { username: 'admin_sai', roleSlug: 'ADMIN', roleLegacy: 'admin' },
  { username: 'manager_sai', roleSlug: 'MANAGER', roleLegacy: 'distributor' },
  { username: 'sales_sai', roleSlug: 'SALESPERSON', roleLegacy: 'user' },
  { username: 'delivery_sai', roleSlug: 'DELIVERY', roleLegacy: 'user' },
  { username: 'customer_sai', roleSlug: 'CUSTOMER', roleLegacy: 'user' },
];

async function getRoleId(pool, slug) {
  let [rows] = await pool.query('SELECT id FROM roles WHERE slug = ? LIMIT 1', [slug]);
  if (!rows.length && slug === 'DELIVERY') {
    [rows] = await pool.query('SELECT id FROM roles WHERE slug = ? LIMIT 1', ['DELIVERY_AGENT']);
  }
  if (!rows.length) throw new Error(`Role not found: ${slug}. Run npm run migrate:enterprise`);
  return rows[0].id;
}

async function upsertUser(pool, user, roleId, passwordHash, plainPassword) {
  const [existing] = await pool.query('SELECT id FROM users WHERE username = ? LIMIT 1', [user.username]);
  if (existing.length) {
    await pool.query(
      `UPDATE users SET password = ?, role = ?, role_id = ?, status = 'active',
       is_active = 1, deleted_at = NULL WHERE username = ?`,
      [passwordHash, user.roleLegacy, roleId, user.username]
    );
    return { action: 'updated', id: existing[0].id, plainPassword };
  }
  const [result] = await pool.query(
    `INSERT INTO users (username, password, role, role_id, status, is_active, deleted_at)
     VALUES (?, ?, ?, ?, 'active', 1, NULL)`,
    [user.username, passwordHash, user.roleLegacy, roleId]
  );
  return { action: 'created', id: result.insertId, plainPassword };
}

async function main() {
  const dbConfig = getDbConfig();
  if (!dbConfig) {
    console.error('Database not configured.');
    process.exit(1);
  }

  console.log(`\nTarget database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}\n`);

  const pool = mysql.createPool({ ...dbConfig, connectionLimit: 2 });
  const credentials = [];

  try {
    for (const user of USERS) {
      if (isUsernameDisabled(user.username)) {
        throw new Error(`Username blocked: ${user.username}`);
      }
      const plainPassword = securePassword();
      const roleId = await getRoleId(pool, user.roleSlug);
      const passwordHash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS);
      const upsert = await upsertUser(pool, user, roleId, passwordHash, plainPassword);
      credentials.push({
        username: user.username,
        password: plainPassword,
        role: user.roleSlug,
        ...upsert,
      });
    }

    console.log('='.repeat(60));
    console.log('ENTERPRISE TEST CREDENTIALS (save securely)');
    console.log('='.repeat(60));
    for (const c of credentials) {
      console.log(`${c.role.padEnd(14)} | ${c.username.padEnd(14)} | ${c.password} | ${c.action}`);
    }
    console.log('='.repeat(60));
    console.log(JSON.stringify({ success: true, users: credentials.map(({ password, ...r }) => ({ ...r, password: '[redacted]' })) }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
