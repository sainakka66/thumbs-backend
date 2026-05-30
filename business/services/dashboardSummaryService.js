const { queryRows } = require('../../lib/db/safeQuery');

function asRows(value) {
  return Array.isArray(value) ? value : [];
}

const Q = {
  todaySales: `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS total
               FROM sales WHERE DATE(created_at) = CURDATE()`,
  weeklySales: `SELECT DATE(created_at) AS day, COALESCE(SUM(total_amount),0) AS total
                FROM sales WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                GROUP BY DATE(created_at) ORDER BY day`,
  monthlySales: `SELECT COALESCE(SUM(total_amount),0) AS total
                 FROM sales WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
  revenue: `SELECT
              COALESCE(SUM(CASE WHEN DATE(created_at)=CURDATE() THEN total_amount END),0) AS today,
              COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN total_amount END),0) AS week,
              COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN total_amount END),0) AS month
            FROM sales`,
  topProducts: `SELECT product_name, SUM(quantity) AS qty, SUM(total_amount) AS revenue
                FROM sales WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                GROUP BY product_name ORDER BY revenue DESC LIMIT 8`,
  lowStock: `SELECT id, Name AS name, quantity AS stock, reorder AS threshold
             FROM inventory WHERE quantity <= reorder ORDER BY quantity ASC LIMIT 10`,
  deliveries: `SELECT
                 SUM(CASE WHEN TRIM(LOWER(status)) IN ('pending','scheduled') THEN 1 ELSE 0 END) AS pending,
                 SUM(CASE WHEN TRIM(LOWER(status)) IN ('completed','delivered','done') THEN 1 ELSE 0 END) AS completed
               FROM deliveries`,
  customers: `SELECT COUNT(*) AS total,
                SUM(CASE WHEN outstanding_balance > 0 THEN 1 ELSE 0 END) AS active
              FROM customers`,
  salesTrend: `SELECT DATE(created_at) AS date, SUM(total_amount) AS amount
               FROM sales WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
               GROUP BY DATE(created_at) ORDER BY date`,
  deliveryPerf: `SELECT DATE(delivery_date) AS date, COUNT(*) AS count,
                   SUM(CASE WHEN TRIM(LOWER(status)) IN ('completed','delivered','done') THEN 1 ELSE 0 END) AS completed
                 FROM deliveries WHERE delivery_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
                 GROUP BY DATE(delivery_date) ORDER BY date`,
  inventory: `SELECT COUNT(*) AS totalProducts,
                COALESCE(SUM(quantity),0) AS totalStock,
                SUM(CASE WHEN quantity <= reorder THEN 1 ELSE 0 END) AS lowStock,
                COALESCE(SUM(quantity * price),0) AS totalValue
              FROM inventory`,
  notifUnread: `SELECT COUNT(*) AS cnt FROM notifications
                WHERE (user_id IS NULL OR user_id = ?) AND is_read = 0`,
  users: `SELECT COUNT(*) AS total,
            SUM(CASE WHEN deleted_at IS NULL AND is_active = 1 AND status = 'active' THEN 1 ELSE 0 END) AS active
          FROM users`,
  recentAudit: `SELECT id, username, action, entity_type, entity_id, created_at
                FROM audit_logs ORDER BY created_at DESC LIMIT 8`,
};

function safe(sql, params = [], fallback = []) {
  return queryRows(sql, params).catch(() => fallback);
}

/**
 * Single-round-trip dashboard payload. All queries run concurrently via Promise.all.
 * Admin-only metrics (users, recent audit) are included only when includeAdmin is true.
 */
async function getDashboardSummary({ userId = null, includeAdmin = false } = {}) {
  const tasks = [
    safe(Q.todaySales),
    safe(Q.weeklySales),
    safe(Q.monthlySales),
    safe(Q.revenue),
    safe(Q.topProducts),
    safe(Q.lowStock),
    safe(Q.deliveries),
    safe(Q.customers),
    safe(Q.salesTrend),
    safe(Q.deliveryPerf),
    safe(Q.inventory),
    safe(Q.notifUnread, [userId], [{ cnt: 0 }]),
    includeAdmin ? safe(Q.users) : Promise.resolve([]),
    includeAdmin ? safe(Q.recentAudit) : Promise.resolve([]),
  ];

  const [
    todaySales, weeklySales, monthlySales, revenue, topProducts, lowStock,
    deliveries, customers, salesTrend, deliveryPerf, inventory, notifUnread,
    users, recentAudit,
  ] = await Promise.all(tasks);

  const today = asRows(todaySales);
  const weekly = asRows(weeklySales);
  const monthly = asRows(monthlySales);
  const rev = asRows(revenue);
  const top = asRows(topProducts);
  const low = asRows(lowStock);
  const del = asRows(deliveries);
  const cust = asRows(customers);
  const trend = asRows(salesTrend);
  const delPerf = asRows(deliveryPerf);
  const inv = asRows(inventory)[0] || {};
  const unread = Number(asRows(notifUnread)[0]?.cnt || 0);

  const payload = {
    todaySales: { count: today[0]?.count || 0, total: Number(today[0]?.total || 0) },
    weeklySales: weekly.map((r) => ({ day: r.day, total: Number(r.total) })),
    monthlySales: Number(monthly[0]?.total || 0),
    revenue: {
      today: Number(rev[0]?.today || 0),
      week: Number(rev[0]?.week || 0),
      month: Number(rev[0]?.month || 0),
    },
    topProducts: top.map((p) => ({
      name: p.product_name,
      qty: Number(p.qty),
      revenue: Number(p.revenue),
    })),
    lowStockProducts: low,
    deliveries: {
      pending: Number(del[0]?.pending || 0),
      completed: Number(del[0]?.completed || 0),
    },
    customers: {
      total: Number(cust[0]?.total || 0),
      active: Number(cust[0]?.active || 0),
    },
    inventory: {
      totalProducts: Number(inv.totalProducts || 0),
      totalStock: Number(inv.totalStock || 0),
      lowStock: Number(inv.lowStock || 0),
      totalValue: Number(inv.totalValue || 0),
    },
    alerts: { lowStockCount: Number(inv.lowStock || 0) },
    unreadNotifications: unread,
    charts: {
      salesTrend: trend.map((r) => ({ date: r.date, amount: Number(r.amount) })),
      revenueTrend: trend.map((r) => ({ date: r.date, amount: Number(r.amount) })),
      productPerformance: top,
      deliveryPerformance: delPerf,
    },
  };

  if (includeAdmin) {
    const userRows = asRows(users);
    payload.admin = {
      users: {
        total: Number(userRows[0]?.total || 0),
        active: Number(userRows[0]?.active || 0),
      },
      recentAudit: asRows(recentAudit),
      unreadNotifications: unread,
      salesToday: { count: payload.todaySales.count, revenue: payload.todaySales.total },
      lowStockCount: Number(inv.lowStock || 0),
    };
  }

  return payload;
}

module.exports = { getDashboardSummary };
