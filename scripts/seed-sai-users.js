/**
 * Seed four RBAC test users (upsert). Uses bcrypt via same rounds as server.js.
 * Usage: node scripts/seed-sai-users.js
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const { getDbConfig, isUsernameDisabled } = require('../config');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

const USERS = [
  {
    username: 'admin_sai',
    password: 'Admin@12345',
    roleSlug: 'ADMIN',
    roleLegacy: 'admin',
  },
  {
    username: 'manager_sai',
    password: 'Manager@12345',
    roleSlug: 'MANAGER',
    roleLegacy: 'distributor',
  },
  {
    username: 'sales_sai',
    password: 'Sales@12345',
    roleSlug: 'SALESPERSON',
    roleLegacy: 'user',
  },
  {
    username: 'delivery_sai',
    password: 'Delivery@12345',
    roleSlug: 'DELIVERY_AGENT',
    roleLegacy: 'user',
  },
];

async function getRoleId(pool, slug) {
  const [rows] = await pool.query('SELECT id FROM roles WHERE slug = ? LIMIT 1', [slug]);
  if (!rows.length) {
    throw new Error(`Role not found: ${slug}. Run npm run migrate:business first.`);
  }
  return rows[0].id;
}

async function upsertUser(pool, user, roleId, passwordHash) {
  const [existing] = await pool.query('SELECT id FROM users WHERE username = ? LIMIT 1', [
    user.username,
  ]);

  if (existing.length) {
    await pool.query(
      `UPDATE users SET password = ?, role = ?, role_id = ?, status = 'active',
       is_active = 1, deleted_at = NULL WHERE username = ?`,
      [passwordHash, user.roleLegacy, roleId, user.username]
    );
    return { action: 'updated', id: existing[0].id };
  }

  const [result] = await pool.query(
    `INSERT INTO users (username, password, role, role_id, status, is_active, deleted_at)
     VALUES (?, ?, ?, ?, 'active', 1, NULL)`,
    [user.username, passwordHash, user.roleLegacy, roleId]
  );
  return { action: 'created', id: result.insertId };
}

async function verifyLogin(baseUrl, username, password) {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json().catch(() => ({}));
  return {
    ok: res.ok && body.success === true && !!body.token,
    status: res.status,
    message: body.message,
  };
}

async function main() {
  const dbConfig = getDbConfig();
  if (!dbConfig) {
    console.error('Database not configured.');
    process.exit(1);
  }

  console.log(`Target database: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);

  const pool = mysql.createPool({ ...dbConfig, connectionLimit: 2 });
  const results = [];

  try {
    for (const user of USERS) {
      if (isUsernameDisabled(user.username)) {
        throw new Error(`Username blocked by policy: ${user.username}`);
      }
      const roleId = await getRoleId(pool, user.roleSlug);
      const passwordHash = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
      const upsert = await upsertUser(pool, user, roleId, passwordHash);

      results.push({
        username: user.username,
        roleSlug: user.roleSlug,
        roleLegacy: user.roleLegacy,
        role_id: roleId,
        ...upsert,
        password: 'bcrypt',
      });
    }

    const apiBase =
      process.env.API_URL ||
      (process.env.SEED_VERIFY_PRODUCTION === '1'
        ? 'https://thumbs-backend.onrender.com'
        : 'http://127.0.0.1:3000');
    console.log(`Login verification API: ${apiBase}`);
    for (const user of USERS) {
      const auth = await verifyLogin(apiBase, user.username, user.password);
      const row = results.find((r) => r.username === user.username);
      row.loginVerified = auth.ok;
      row.loginStatus = auth.status;
      if (!auth.ok) row.loginMessage = auth.message;
    }

    console.log(JSON.stringify({ success: true, users: results }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
