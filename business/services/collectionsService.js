const { query, queryRows } = require('../../lib/db/safeQuery');
const { customerOutstandingQr } = require('../../lib/payments/upiQr');

async function getDuesDashboard() {
  const [summary] = await queryRows(
    `SELECT
       COUNT(*) AS customers_with_due,
       COALESCE(SUM(outstanding_balance),0) AS total_outstanding,
       SUM(CASE WHEN outstanding_balance > credit_limit AND credit_limit > 0 THEN 1 ELSE 0 END) AS over_limit_count
     FROM customers WHERE outstanding_balance > 0`
  ).catch(() => [{}]);

  const aging = await queryRows(
    `SELECT bucket, COUNT(*) AS customers, COALESCE(SUM(outstanding_balance),0) AS amount FROM (
       SELECT c.outstanding_balance,
         CASE
           WHEN DATEDIFF(CURDATE(), COALESCE((SELECT MAX(created_at) FROM sales s WHERE s.customer_id = c.id), CURDATE())) <= 30 THEN '0-30'
           WHEN DATEDIFF(CURDATE(), COALESCE((SELECT MAX(created_at) FROM sales s WHERE s.customer_id = c.id), CURDATE())) <= 60 THEN '31-60'
           WHEN DATEDIFF(CURDATE(), COALESCE((SELECT MAX(created_at) FROM sales s WHERE s.customer_id = c.id), CURDATE())) <= 90 THEN '61-90'
           ELSE '90+'
         END AS bucket
       FROM customers c WHERE c.outstanding_balance > 0
     ) t GROUP BY bucket`
  ).catch(() => []);

  return { summary: summary || {}, aging };
}

async function listCollections({ customerId, limit = 50 } = {}) {
  let sql = `SELECT c.*, u.username AS collector_name, cu.shop_name AS customer_name
             FROM collections c
             LEFT JOIN users u ON u.id = c.collected_by
             LEFT JOIN customers cu ON cu.id = c.customer_id
             WHERE 1=1`;
  const params = [];
  if (customerId) {
    sql += ' AND c.customer_id = ?';
    params.push(customerId);
  }
  sql += ' ORDER BY c.collected_at DESC LIMIT ?';
  params.push(limit);
  return queryRows(sql, params).catch(() => []);
}

async function recordCollection(data, userId) {
  const [result] = await query(
    `INSERT INTO collections (customer_id, amount, payment_method, reference_no, collected_by, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.customerId,
      data.amount,
      data.paymentMethod,
      data.referenceNo || null,
      userId,
      data.notes || null,
    ]
  );
  const insertId = result.insertId;
  await queryRows(
    `UPDATE customers SET outstanding_balance = GREATEST(0, outstanding_balance - ?) WHERE id = ?`,
    [data.amount, data.customerId]
  ).catch(() => {});
  return insertId;
}

async function getCustomerUpiQr(customerId) {
  const rows = await queryRows(
    `SELECT id, shop_name, outstanding_balance FROM customers WHERE id = ? LIMIT 1`,
    [customerId]
  );
  if (!rows.length) return null;
  return customerOutstandingQr(rows[0]);
}

async function getFeatureFlags() {
  return queryRows(`SELECT flag_key, enabled, config FROM feature_flags`).catch(() => []);
}

module.exports = {
  getDuesDashboard,
  listCollections,
  recordCollection,
  getCustomerUpiQr,
  getFeatureFlags,
};
