const { queryRows } = require('../../lib/db/safeQuery');
const notificationService = require('./notificationService');

async function syncStockAlerts() {
  const lowRows = await queryRows(
    `SELECT id, Name AS product_name, quantity AS current_stock, reorder AS threshold
     FROM inventory WHERE quantity <= reorder`
  );

  const alerts = [];
  for (const row of lowRows) {
    const existing = await queryRows(
      `SELECT id FROM stock_alerts WHERE inventory_id = ? AND status = 'active' LIMIT 1`,
      [row.id]
    ).catch(() => []);

    if (!existing.length) {
      await queryRows(
        `INSERT INTO stock_alerts (inventory_id, product_name, current_stock, threshold, status)
         VALUES (?, ?, ?, ?, 'active')`,
        [row.id, row.product_name, row.current_stock, row.threshold]
      ).catch(() => {});
      await notificationService.createNotification({
        type: 'low_stock',
        title: 'Low stock alert',
        message: `${row.product_name} is at ${row.current_stock} cases (threshold ${row.threshold})`,
        entityType: 'inventory',
        entityId: row.id,
      });
    }
    alerts.push(row);
  }

  await queryRows(
    `UPDATE stock_alerts sa
     JOIN inventory i ON i.id = sa.inventory_id
     SET sa.status = 'resolved', sa.resolved_at = NOW()
     WHERE sa.status = 'active' AND i.quantity > i.reorder`
  ).catch(() => {});

  return alerts;
}

async function listActiveAlerts() {
  try {
    return await queryRows(
      `SELECT id, inventory_id, product_name, current_stock, threshold, status, alert_date, resolved_at
       FROM stock_alerts WHERE status = 'active' ORDER BY alert_date DESC LIMIT 100`
    );
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE') {
      const rows = await queryRows(
        `SELECT id AS inventory_id, Name AS product_name, quantity AS current_stock, reorder AS threshold
         FROM inventory WHERE quantity <= reorder LIMIT 100`
      );
      return rows.map((r) => ({ ...r, status: 'active', alert_date: new Date() }));
    }
    throw e;
  }
}

module.exports = { syncStockAlerts, listActiveAlerts };
