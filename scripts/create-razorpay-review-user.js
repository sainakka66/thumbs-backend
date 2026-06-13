/**
 * Provision dedicated Razorpay onboarding review admin (password-only login).
 * Usage: node scripts/create-razorpay-review-user.js
 * Env: RAZORPAY_REVIEW_USERNAME, RAZORPAY_REVIEW_PASSWORD (optional overrides)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.railway'), override: true });
require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');

const USERNAME = process.env.RAZORPAY_REVIEW_USERNAME || 'razorpay_review';
const PASSWORD = process.env.RAZORPAY_REVIEW_PASSWORD || 'ThumbsUp@RzpReview2026';
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

async function getAdminRoleId(conn) {
  const [rows] = await conn.query(`SELECT id FROM roles WHERE slug = 'ADMIN' LIMIT 1`);
  if (!rows.length) throw new Error('ADMIN role missing — run migrations first');
  return rows[0].id;
}

async function main() {
  const config = getDbConfig();
  if (!config) throw new Error('Database not configured');
  const conn = await mysql.createConnection(config);
  const roleId = await getAdminRoleId(conn);
  const hash = await bcrypt.hash(PASSWORD, BCRYPT_ROUNDS);

  const [existing] = await conn.query('SELECT id FROM users WHERE username = ? LIMIT 1', [USERNAME]);
  let userId;
  if (existing.length) {
    userId = existing[0].id;
    await conn.query(
      `UPDATE users SET password = ?, role = 'admin', role_id = ?, status = 'active',
       is_active = 1, deleted_at = NULL, email = NULL, email_verified = 0,
       mfa_enabled = 0, mfa_enforced = 0, updated_at = NOW() WHERE id = ?`,
      [hash, roleId, userId]
    );
    console.log(`Updated review admin: ${USERNAME}`);
  } else {
    const [ins] = await conn.query(
      `INSERT INTO users (username, password, role, role_id, status, is_active, email, email_verified, mfa_enabled, mfa_enforced)
       VALUES (?, ?, 'admin', ?, 'active', 1, NULL, 0, 0, 0)`,
      [USERNAME, hash, roleId]
    );
    userId = ins.insertId;
    console.log(`Created review admin: ${USERNAME}`);
  }
  await conn.query('DELETE FROM user_mfa_settings WHERE user_id = ?', [userId]).catch(() => {});

  console.log('\n' + '='.repeat(60));
  console.log('RAZORPAY REVIEW CREDENTIALS — paste into Razorpay onboarding');
  console.log('='.repeat(60));
  console.log(`Website URL : https://thumbs-up-app-two.vercel.app/login`);
  console.log(`Username    : ${USERNAME}`);
  console.log(`Password    : ${PASSWORD}`);
  console.log(`Role        : ADMIN (full access, payments, customers)`);
  console.log('\nTest payment: Customers → select customer → Pay with UPI');
  console.log('Test card    : 4111 1111 1111 1111 (any expiry/CVV) until UPI is enabled');
  console.log('='.repeat(60));

  await conn.end();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
