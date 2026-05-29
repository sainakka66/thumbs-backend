const { queryRows } = require('../../lib/db/safeQuery');

async function globalSearch(q, permissions, userId, roleSlug) {
  const term = `%${String(q).trim().slice(0, 80)}%`;
  if (!term || term === '%%') return { customers: [], inventory: [], sales: [], deliveries: [] };

  const result = { customers: [], inventory: [], sales: [], deliveries: [] };

  if (permissions.has('customers.view') || roleSlug === 'ADMIN') {
    result.customers = await queryRows(
      `SELECT id, shop_name, owner_name, phone, area FROM customers
       WHERE shop_name LIKE ? OR owner_name LIKE ? OR phone LIKE ? OR area LIKE ?
       LIMIT 15`,
      [term, term, term, term]
    );
  }

  if (permissions.has('inventory.view') || roleSlug === 'ADMIN') {
    result.inventory = await queryRows(
      `SELECT id, Name AS name, sku, quantity, price FROM inventory
       WHERE Name LIKE ? OR sku LIKE ? OR category LIKE ?
       LIMIT 15`,
      [term, term, term]
    );
  }

  if (permissions.has('sales.view') || roleSlug === 'ADMIN') {
    result.sales = await queryRows(
      `SELECT s.id, s.product_name, s.total_amount, c.shop_name AS customer_name
       FROM sales s LEFT JOIN customers c ON c.id = s.customer_id
       WHERE s.product_name LIKE ? OR c.shop_name LIKE ? OR s.notes LIKE ?
       ORDER BY s.id DESC LIMIT 15`,
      [term, term, term]
    );
  }

  const canDeliveries =
    permissions.has('deliveries.view') ||
    permissions.has('deliveries.view_own') ||
    roleSlug === 'ADMIN';

  if (canDeliveries) {
    let sql = `
      SELECT d.id, d.product_name, d.status, d.delivery_date, c.shop_name AS customer_name
      FROM deliveries d LEFT JOIN customers c ON c.id = d.customer_id
      WHERE (d.product_name LIKE ? OR c.shop_name LIKE ? OR d.driver_name LIKE ? OR d.vehicle_no LIKE ?)`;
    const params = [term, term, term, term];
    if (permissions.has('deliveries.view_own') && roleSlug === 'DELIVERY_AGENT') {
      sql += ' AND d.assigned_user_id = ?';
      params.push(userId);
    }
    sql += ' ORDER BY d.id DESC LIMIT 15';
    result.deliveries = await queryRows(sql, params);
  }

  return result;
}

module.exports = { globalSearch };
