const { queryRows } = require('../../lib/db/safeQuery');

async function getAdminDashboard() {
  const [[users], [audit], [notif], [sales], [lowStock]] = await Promise.all([
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

  return {
    users: {
      total: Number(users[0]?.total || 0),
      active: Number(users[0]?.active || 0),
    },
    recentAudit: Array.isArray(audit) ? audit : [],
    unreadNotifications: Number(notif[0]?.unread || 0),
    salesToday: {
      count: Number(sales[0]?.count || 0),
      revenue: Number(sales[0]?.revenue || 0),
    },
    lowStockCount: Number(lowStock[0]?.cnt || 0),
  };
}

module.exports = { getAdminDashboard };
