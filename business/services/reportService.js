const { queryRows } = require('../../lib/db/safeQuery');

function dateRangeClause(range, customFrom, customTo) {
  if (range === 'today') return ['DATE(created_at) = CURDATE()', []];
  if (range === 'week') return ['created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)', []];
  if (range === 'month') return ['created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)', []];
  if (range === 'custom' && customFrom && customTo) {
    return ['DATE(created_at) BETWEEN ? AND ?', [customFrom, customTo]];
  }
  return ['created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)', []];
}

async function salesReport(range, from, to) {
  const [clause, params] = dateRangeClause(range, from, to);
  return queryRows(
    `SELECT s.*, c.shop_name AS customer_name FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     WHERE ${clause.replace('created_at', 's.created_at')}
     ORDER BY s.id DESC`,
    params
  );
}

async function inventoryReport() {
  return queryRows(
    `SELECT id, Name AS name, sku, category, quantity, price, reorder,
            (quantity * price) AS value FROM inventory ORDER BY Name`
  );
}

async function customerReport() {
  return queryRows(
    `SELECT id, shop_name, owner_name, phone, area, credit_limit, outstanding_balance
     FROM customers ORDER BY shop_name`
  );
}

async function deliveryReport(range, from, to) {
  const [clause, params] = dateRangeClause(range, from, to);
  const c = clause.replace('created_at', 'd.delivery_date');
  return queryRows(
    `SELECT d.*, c.shop_name AS customer_name FROM deliveries d
     LEFT JOIN customers c ON c.id = d.customer_id
     WHERE ${c}
     ORDER BY d.id DESC`,
    params
  );
}

function toCsv(rows, columns) {
  const header = columns.join(',');
  const lines = rows.map((row) =>
    columns.map((col) => {
      const v = row[col];
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')
  );
  return [header, ...lines].join('\n');
}

module.exports = {
  salesReport,
  inventoryReport,
  customerReport,
  deliveryReport,
  toCsv,
  dateRangeClause,
};
