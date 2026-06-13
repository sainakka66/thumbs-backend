const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.railway'), override: true });
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');

(async () => {
  const conn = await mysql.createConnection(getDbConfig());
  const [perms] = await conn.query(
    `SELECT p.slug FROM users u
     JOIN roles r ON r.id = u.role_id
     JOIN role_permissions rp ON rp.role_id = r.id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE u.username = 'sales_sai' AND p.slug LIKE 'payments.%'`
  );
  console.log('sales_sai payments perms:', perms.map((r) => r.slug));

  const [orders] = await conn.query(
    `SELECT id, order_uuid, status, lifecycle_stage, created_at FROM payment_orders ORDER BY id DESC LIMIT 5`
  );
  console.log('recent orders:', orders);

  await conn.end();
})();
