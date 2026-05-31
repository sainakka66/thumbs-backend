const { query, queryRows } = require('../../lib/db/safeQuery');

async function listSuppliers() {
  return queryRows(
    `SELECT id, code, name, phone, email, gstin, is_active, created_at FROM suppliers ORDER BY name`
  ).catch(() => []);
}

async function createSupplier(data) {
  const [r] = await query(
    `INSERT INTO suppliers (code, name, phone, email, gstin, address) VALUES (?, ?, ?, ?, ?, ?)`,
    [data.code, data.name, data.phone || null, data.email || null, data.gstin || null, data.address || null]
  );
  return r.insertId;
}

async function listPurchaseOrders() {
  return queryRows(
    `SELECT po.*, s.name AS supplier_name FROM purchase_orders po
     JOIN suppliers s ON s.id = po.supplier_id ORDER BY po.created_at DESC LIMIT 100`
  ).catch(() => []);
}

async function createPurchaseOrder(data, userId) {
  const [r] = await query(
    `INSERT INTO purchase_orders (supplier_id, po_number, status, total_amount, expected_date, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.supplierId,
      data.poNumber,
      data.status || 'draft',
      data.totalAmount || 0,
      data.expectedDate || null,
      userId,
    ]
  );
  return r.insertId;
}

async function recordStockInward(data, userId) {
  const [r] = await query(
    `INSERT INTO stock_inward (purchase_order_id, supplier_id, product_name, quantity, unit_cost, received_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.purchaseOrderId || null,
      data.supplierId,
      data.productName,
      data.quantity,
      data.unitCost || null,
      userId,
    ]
  );
  await queryRows(
    `INSERT INTO inventory (Name, quantity, price, reorder) VALUES (?, ?, ?, 10)
     ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity)`,
    [data.productName, data.quantity, data.unitCost || 0]
  ).catch(() => {});
  return r.insertId;
}

async function getSupplierLedger(supplierId) {
  return queryRows(
    `SELECT * FROM supplier_ledger WHERE supplier_id = ? ORDER BY created_at DESC LIMIT 100`,
    [supplierId]
  ).catch(() => []);
}

async function getPurchaseAnalytics() {
  const [totals] = await queryRows(
    `SELECT COUNT(*) AS po_count, COALESCE(SUM(total_amount),0) AS po_value FROM purchase_orders`
  ).catch(() => [{}]);
  const inward = await queryRows(
    `SELECT DATE(received_at) AS day, SUM(quantity) AS units
     FROM stock_inward WHERE received_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY DATE(received_at) ORDER BY day`
  ).catch(() => []);
  return { totals: totals || {}, inward };
}

module.exports = {
  listSuppliers,
  createSupplier,
  listPurchaseOrders,
  createPurchaseOrder,
  recordStockInward,
  getSupplierLedger,
  getPurchaseAnalytics,
};
