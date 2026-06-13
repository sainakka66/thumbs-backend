const { queryRows } = require('../../lib/db/safeQuery');

async function getCustomerById(id) {
  const rows = await queryRows(
    `SELECT id, shop_name, owner_name, phone, email, outstanding_balance
     FROM customers WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function getDistributorById(id) {
  const rows = await queryRows(
    `SELECT id, user_id, code, name, phone, email, status, is_active
     FROM distributors WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function countDuplicateIdentity({ email, phone, excludeUserId }) {
  let cnt = 0;
  const normalizedEmail = email && String(email).trim() ? String(email).trim() : null;
  const normalizedPhone = phone && String(phone).trim() ? String(phone).trim() : null;
  if (normalizedEmail) {
    const e = await queryRows(
      `SELECT COUNT(*) AS c FROM users WHERE email = ? AND id != ? AND deleted_at IS NULL`,
      [normalizedEmail, excludeUserId || 0]
    );
    cnt += e[0]?.c || 0;
  }
  if (normalizedPhone) {
    const p = await queryRows(
      `SELECT COUNT(*) AS c FROM users WHERE phone = ? AND id != ? AND deleted_at IS NULL`,
      [normalizedPhone, excludeUserId || 0]
    );
    cnt += p[0]?.c || 0;
  }
  return cnt;
}

module.exports = { getCustomerById, getDistributorById, countDuplicateIdentity };
