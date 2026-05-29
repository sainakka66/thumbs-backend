/**
 * Seed realistic dealership-style volume data for browser execution.
 * Usage: npm run seed:realistic-data
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');

const AREAS = ['North Zone', 'South Zone', 'East Market', 'West Hub', 'Central Depot', 'Ring Road', 'Industrial'];
const BRANDS = ['Thums Up', 'Coca Cola', 'Sprite', 'Fanta', 'Limca', 'Maaza', 'Kinley'];
const SIZES = ['200ml', '300ml', '500ml', '1L', '1.25L', '2L'];
const SHOP_PREFIX = ['Shree', 'New', 'City', 'Metro', 'Royal', 'Prime', 'Golden', 'Star'];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function main() {
  const config = getDbConfig();
  if (!config) {
    console.error('Database not configured.');
    process.exit(1);
  }

  const conn = await mysql.createConnection(config);
  console.log('\n=== Seeding realistic dealership data ===\n');

  try {
    const [[{ custCount }]] = await conn.query('SELECT COUNT(*) AS custCount FROM customers');
    if (custCount >= 40) {
      console.log(`Skipping bulk seed — ${custCount} customers already exist`);
    } else {
      for (let i = 1; i <= 50; i++) {
        await conn.query(
          `INSERT INTO customers (shop_name, owner_name, phone, email, address, area, credit_limit, opening_balance, outstanding_balance)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `${pick(SHOP_PREFIX)} ${pick(BRANDS)} Mart ${i}`,
            `Owner ${i}`,
            `98${String(10000000 + i).slice(-8)}`,
            `shop${i}@deal.test`,
            `${i} Market Road`,
            pick(AREAS),
            rand(5000, 50000),
            rand(0, 5000),
            rand(0, 15000),
          ]
        );
      }
      console.log('✓ 50 customers');
    }

    try {
      const [[{ distCount }]] = await conn.query('SELECT COUNT(*) AS distCount FROM distributors');
      if (distCount < 15) {
        for (let i = 1; i <= 20; i++) {
          await conn.query(
            `INSERT INTO distributors (code, name, phone, email, status, is_active)
             VALUES (?, ?, ?, ?, 'active', 1)`,
            [`DIST-${1000 + i}`, `${pick(SHOP_PREFIX)} Distributors ${i}`, `91${rand(7000000000, 9999999999)}`, `dist${i}@supply.test`]
          );
        }
        console.log('✓ 20 distributors (supplier records)');
      }
    } catch (e) {
      if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
      console.log('⚠ distributors table missing — skip suppliers');
    }

    const [[{ invCount }]] = await conn.query('SELECT COUNT(*) AS invCount FROM inventory');
    if (invCount < 80) {
      for (let i = 1; i <= 100; i++) {
        const brand = pick(BRANDS);
        const qty = rand(0, 120);
        const reorder = rand(5, 15);
        await conn.query(
          `INSERT INTO inventory (Name, quantity, price, sku, category, size, bpc, reorder)
           VALUES (?, ?, ?, ?, ?, ?, 24, ?)`,
          [`${brand} ${pick(SIZES)}`, qty, rand(80, 450), `SKU-${brand.slice(0, 3).toUpperCase()}-${i}`, 'Beverages', pick(SIZES), reorder]
        );
      }
      console.log('✓ 100 inventory products');
    }

    const [customers] = await conn.query('SELECT id FROM customers LIMIT 50');
    const [products] = await conn.query('SELECT Name, price FROM inventory LIMIT 100');
    const [[{ saleCount }]] = await conn.query('SELECT COUNT(*) AS saleCount FROM sales');

    if (saleCount < 150 && customers.length && products.length) {
      for (let i = 0; i < 200; i++) {
        const c = customers[i % customers.length];
        const p = products[i % products.length];
        const qty = rand(1, 20);
        const price = Number(p.price) || 100;
        const total = qty * price;
        const paid = rand(0, 1) ? total : rand(0, Math.floor(total));
        const daysAgo = rand(0, 90);
        await conn.query(
          `INSERT INTO sales (customer_id, product_name, quantity, price_per_case, total_amount, amount_paid, payment_mode, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))`,
          [c.id, p.Name, qty, price, total, paid, pick(['Cash', 'UPI', 'Credit']), 'Seed sale', daysAgo]
        );
      }
      console.log('✓ 200 sales');
    }

    const [[delUser]] = await conn.query("SELECT id FROM users WHERE username = 'delivery_test' LIMIT 1");
    const [[{ delCount }]] = await conn.query('SELECT COUNT(*) AS delCount FROM deliveries');

    if (delCount < 40 && customers.length && products.length) {
      for (let i = 0; i < 50; i++) {
        const c = customers[i % customers.length];
        const p = products[i % products.length];
        const status = pick(['Pending', 'In Transit', 'Delivered', 'Failed']);
        const assignee = i < 15 && delUser ? delUser.id : null;
        try {
          await conn.query(
            `INSERT INTO deliveries (customer_id, assigned_user_id, product_name, quantity, delivery_date, driver_name, vehicle_no, status, notes)
             VALUES (?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY), ?, ?, ?, ?)`,
            [c.id, assignee, p.Name, rand(5, 40), rand(-3, 7), `Driver ${rand(1, 20)}`, `KA-${rand(10, 99)}-${rand(1000, 9999)}`, status, 'Seed delivery']
          );
        } catch (e) {
          if (e.code === 'ER_BAD_FIELD_ERROR') {
            await conn.query(
              `INSERT INTO deliveries (customer_id, product_name, quantity, delivery_date, driver_name, vehicle_no, status, notes)
               VALUES (?, ?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY), ?, ?, ?, ?)`,
              [c.id, p.Name, rand(5, 40), rand(-3, 7), `Driver ${rand(1, 20)}`, `KA-${rand(10, 99)}-X`, status, 'Seed delivery']
            );
          } else throw e;
        }
      }
      console.log('✓ 50 deliveries (15 assigned to delivery_test when possible)');
    }

    try {
      await conn.query(
        `INSERT INTO notifications (user_id, type, title, message, entity_type, is_read)
         SELECT NULL, 'low_stock', CONCAT('Low stock: ', Name), CONCAT(quantity, ' cases left'), 'inventory', 0
         FROM inventory WHERE quantity <= reorder LIMIT 15`
      );
      console.log('✓ notifications from low stock');
    } catch (e) {
      if (e.code !== 'ER_NO_SUCH_TABLE') console.warn('notifications:', e.message);
    }

    try {
      await conn.query(
        `INSERT INTO stock_alerts (inventory_id, product_name, current_stock, threshold, status)
         SELECT id, Name, quantity, reorder, 'active' FROM inventory WHERE quantity <= reorder LIMIT 20`
      );
      console.log('✓ stock_alerts');
    } catch (e) {
      if (e.code !== 'ER_NO_SUCH_TABLE') console.warn('stock_alerts:', e.message);
    }

    try {
      const [[admin]] = await conn.query("SELECT id, username FROM users WHERE username = 'admin_test' LIMIT 1");
      if (admin) {
        for (let i = 0; i < 30; i++) {
          await conn.query(
            `INSERT INTO audit_logs (user_id, username, action, entity_type, entity_id, after_value, ip_address)
             VALUES (?, ?, ?, 'seed', ?, ?, '127.0.0.1')`,
            [admin.id, admin.username, pick(['sale_create', 'customer_create', 'inventory_update', 'login']), String(i), JSON.stringify({ seed: true })]
          );
        }
        console.log('✓ 30 sample audit_logs');
      }
    } catch (e) {
      if (e.code !== 'ER_NO_SUCH_TABLE') console.warn('audit_logs:', e.message);
    }

    console.log('\n✓ seed:realistic-data complete\n');
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
