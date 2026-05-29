const { queryRows } = require('../../lib/db/safeQuery');

function asRows(value) {
  return Array.isArray(value) ? value : [];
}

async function getAdminDashboard() {
  const [users, audit, notif, sales, lowStock] = await Promise.all([
    queryRows(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN deleted_at IS NULL AND is_active = 1 AND status = 'active' THEN 1 ELSE 0 END) AS active
       FROM users`
    ),
    queryRows(
      `SELECT id, username, action, entity_type, entity_id, created_at
       FROM audit_logs ORDER BY created_at DESC LIMIT 8`
    ).catch(() => []),
    queryRows(
      `SELECT COUNT(*) AS unread FROM notifications WHERE is_read = 0`
    ).catch(() => [{ unread: 0 }]),
    queryRows(
      `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS revenue
       FROM sales WHERE DATE(created_at) = CURDATE()`
    ),
    queryRows(
      `SELECT COUNT(*) AS cnt FROM inventory WHERE quantity <= reorder`
    ),
  ]);

  const userRows = asRows(users);
  const auditRows = asRows(audit);
  const notifRows = asRows(notif);
  const salesRows = asRows(sales);
  const lowRows = asRows(lowStock);

  return {
    users: {
      total: Number(userRows[0]?.total || 0),
      active: Number(userRows[0]?.active || 0),
    },
    recentAudit: auditRows,
    unreadNotifications: Number(notifRows[0]?.unread || 0),
    salesToday: {
      count: Number(salesRows[0]?.count || 0),
      revenue: Number(salesRows[0]?.revenue || 0),
    },
    lowStockCount: Number(lowRows[0]?.cnt || 0),
  };
}

module.exports = { getAdminDashboard };
