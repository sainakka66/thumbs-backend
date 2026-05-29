const { queryRows } = require('../../lib/db/safeQuery');

async function getExecutiveDashboard() {
  const [[todaySales], [weeklySales], [monthlySales], [revenue], [topProducts], [lowStock], [deliveries], [customers]] =
    await Promise.all([
      queryRows(
        `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS total
         FROM sales WHERE DATE(created_at) = CURDATE()`
      ),
      queryRows(
        `SELECT DATE(created_at) AS day, COALESCE(SUM(total_amount),0) AS total
         FROM sales WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
         GROUP BY DATE(created_at) ORDER BY day`
      ),
      queryRows(
        `SELECT COALESCE(SUM(total_amount),0) AS total
         FROM sales WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`
      ),
      queryRows(
        `SELECT
           COALESCE(SUM(CASE WHEN DATE(created_at)=CURDATE() THEN total_amount END),0) AS today,
           COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN total_amount END),0) AS week,
           COALESCE(SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY) THEN total_amount END),0) AS month
         FROM sales`
      ),
      queryRows(
        `SELECT product_name, SUM(quantity) AS qty, SUM(total_amount) AS revenue
         FROM sales WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
         GROUP BY product_name ORDER BY revenue DESC LIMIT 8`
      ),
      queryRows(
        `SELECT id, Name AS name, quantity AS stock, reorder AS threshold
         FROM inventory WHERE quantity <= reorder ORDER BY quantity ASC LIMIT 10`
      ),
      queryRows(
        `SELECT
           SUM(CASE WHEN TRIM(LOWER(status)) IN ('pending','scheduled') THEN 1 ELSE 0 END) AS pending,
           SUM(CASE WHEN TRIM(LOWER(status)) IN ('completed','delivered','done') THEN 1 ELSE 0 END) AS completed
         FROM deliveries`
      ),
      queryRows(
        `SELECT COUNT(*) AS total,
           SUM(CASE WHEN outstanding_balance > 0 THEN 1 ELSE 0 END) AS active
         FROM customers`
      ),
    ]);

  const salesTrend = await queryRows(
    `SELECT DATE(created_at) AS date, SUM(total_amount) AS amount
     FROM sales WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
     GROUP BY DATE(created_at) ORDER BY date`
  );

  const deliveryPerf = await queryRows(
    `SELECT DATE(delivery_date) AS date, COUNT(*) AS count,
            SUM(CASE WHEN TRIM(LOWER(status)) IN ('completed','delivered','done') THEN 1 ELSE 0 END) AS completed
     FROM deliveries WHERE delivery_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
     GROUP BY DATE(delivery_date) ORDER BY date`
  );

  return {
    todaySales: { count: todaySales[0]?.count || 0, total: Number(todaySales[0]?.total || 0) },
    weeklySales: weeklySales.map((r) => ({ day: r.day, total: Number(r.total) })),
    monthlySales: Number(monthlySales[0]?.total || 0),
    revenue: {
      today: Number(revenue[0]?.today || 0),
      week: Number(revenue[0]?.week || 0),
      month: Number(revenue[0]?.month || 0),
    },
    topProducts: topProducts.map((p) => ({
      name: p.product_name,
      qty: Number(p.qty),
      revenue: Number(p.revenue),
    })),
    lowStockProducts: lowStock,
    deliveries: {
      pending: Number(deliveries[0]?.pending || 0),
      completed: Number(deliveries[0]?.completed || 0),
    },
    customers: {
      total: Number(customers[0]?.total || 0),
      active: Number(customers[0]?.active || 0),
    },
    charts: {
      salesTrend: salesTrend.map((r) => ({ date: r.date, amount: Number(r.amount) })),
      revenueTrend: salesTrend.map((r) => ({ date: r.date, amount: Number(r.amount) })),
      productPerformance: topProducts,
      deliveryPerformance: deliveryPerf,
    },
  };
}

module.exports = { getExecutiveDashboard };
