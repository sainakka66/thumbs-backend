/**
 * Seed RBAC test users for verification harness.
 * Usage: npm run seed:test-users
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

const USERS = [
  { username: 'admin_test', password: 'TestAdmin!2026', roleSlug: 'ADMIN', roleLegacy: 'admin' },
  { username: 'manager_test', password: 'TestManager!2026', roleSlug: 'MANAGER', roleLegacy: 'distributor' },
  { username: 'sales_test', password: 'TestSales!2026', roleSlug: 'SALESPERSON', roleLegacy: 'user' },
  { username: 'delivery_test', password: 'TestDelivery!2026', roleSlug: 'DELIVERY_AGENT', roleLegacy: 'user' },
];

async function main() {
  const config = getDbConfig();
  if (!config) {
    console.error('Database not configured.');
    process.exit(1);
  }

  const conn = await mysql.createConnection(config);
  console.log('\n=== ThumbsUp Test User Seed ===\n');

  try {
    const [roles] = await conn.query('SELECT id, slug FROM roles');
    const roleMap = Object.fromEntries(roles.map((r) => [r.slug, r.id]));

    if (!roles.length) {
      console.warn('⚠ roles table empty — run npm run migrate:business first');
    }

    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
      const roleId = roleMap[u.roleSlug] || null;

      const [existing] = await conn.query('SELECT id FROM users WHERE username = ?', [u.username]);
      if (existing.length) {
        try {
          await conn.query(
            'UPDATE users SET password = ?, role = ?, role_id = ?, status = ?, is_active = 1 WHERE username = ?',
            [hash, u.roleLegacy, roleId, 'active', u.username]
          );
        } catch (e) {
          if (e.code === 'ER_BAD_FIELD_ERROR') {
            await conn.query('UPDATE users SET password = ?, role = ? WHERE username = ?', [
              hash,
              u.roleLegacy,
              u.username,
            ]);
          } else throw e;
        }
        console.log(`Updated: ${u.username} (${u.roleSlug})`);
      } else {
        try {
          await conn.query(
            `INSERT INTO users (username, password, role, role_id, status, is_active)
             VALUES (?, ?, ?, ?, 'active', 1)`,
            [u.username, hash, u.roleLegacy, roleId]
          );
        } catch (e) {
          if (e.code === 'ER_BAD_FIELD_ERROR') {
            await conn.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [
              u.username,
              hash,
              u.roleLegacy,
            ]);
          } else throw e;
        }
        console.log(`Created: ${u.username} (${u.roleSlug})`);
      }
    }

    console.log('\n--- Test credentials (save securely) ---\n');
    for (const u of USERS) {
      console.log(`${u.roleSlug.padEnd(16)} ${u.username} / ${u.password}`);
    }
    console.log('\n✓ seed:test-users complete\n');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
