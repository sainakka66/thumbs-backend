const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const SECRET = "mysecretkey";

const app = express();
app.use(cors());
app.use(express.json());

/* ================= TOKEN ================= */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).json("No token");

  const token = authHeader.split(' ')[1];

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).json("Invalid token");
    req.user = decoded;
    next();
  });
}

/* ================= DB ================= */
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT
});

/* ================= LOGIN ================= */
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const [rows] = await db.query(
      "SELECT * FROM users WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return res.json({ success: false, message: "User not found" });
    }

    const user = rows[0];

    if (password !== user.password) {
      return res.json({ success: false, message: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      SECRET,
      { expiresIn: '1h' }
    );

    res.json({ success: true, token });

  } catch (err) {
    res.status(500).json(err);
  }
});

/* ================= PRODUCTS ================= */
app.get('/products', verifyToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      'SELECT * FROM inventory LIMIT ? OFFSET ?',
      [limit, offset]
    );

    res.json(rows);

  } catch (err) {
    res.status(500).json(err);
  }
});

/* ================= SEARCH ================= */
app.get('/products/search/:key', verifyToken, async (req, res) => {
  try {
    const key = req.params.key;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT * FROM inventory 
       WHERE Name LIKE ? OR sku LIKE ?
       LIMIT ? OFFSET ?`,
      [`%${key}%`, `%${key}%`, limit, offset]
    );

    res.json(rows);

  } catch (err) {
    res.status(500).json(err);
  }
});

/* ================= ADD PRODUCT ================= */
app.post('/products', verifyToken, async (req, res) => {
  try {
    const { Name, quantity, price, sku, category, size, bpc, reorder } = req.body;

    const [result] = await db.query(
      `INSERT INTO inventory 
      (Name, quantity, price, sku, category, size, bpc, reorder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [Name, quantity, price, sku, category, size, bpc, reorder]
    );

    res.json({ success: true, id: result.insertId });

  } catch (err) {
    res.status(500).json(err);
  }
});

/* ================= DELETE PRODUCT ================= */
app.delete('/products/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;

    await db.query('DELETE FROM inventory WHERE id = ?', [id]);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json(err);
  }
});

/* ================= UPDATE PRODUCT ================= */
app.put('/products/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { Name, quantity, price, sku, category, size, bpc, reorder } = req.body;

    await db.query(
      `UPDATE inventory 
       SET Name=?, quantity=?, price=?, sku=?, category=?, size=?, bpc=?, reorder=?
       WHERE id=?`,
      [Name, quantity, price, sku, category, size, bpc, reorder, id]
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json(err);
  }
});

/* ================= STATS ================= */
app.get('/products/stats', verifyToken, async (req, res) => {
  try {
    const sql = `
      SELECT 
        COUNT(*) AS totalProducts,
        SUM(quantity) AS totalStock,
        SUM(CASE WHEN quantity <= reorder THEN 1 ELSE 0 END) AS lowStock,
        SUM(quantity * price) AS totalValue
      FROM inventory
    `;

    const [rows] = await db.query(sql);
    res.json(rows[0]);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= CUSTOMERS ================= */
app.get('/customers', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM customers ORDER BY shop_name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/customers', verifyToken, async (req, res) => {
  try {
    const {
      shop_name,
      owner_name,
      phone,
      email,
      address,
      area,
      credit_limit,
      opening_balance
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO customers 
      (shop_name, owner_name, phone, email, address, area, credit_limit, opening_balance)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shop_name,
        owner_name,
        phone,
        email,
        address,
        area,
        credit_limit,
        opening_balance
      ]
    );

    res.json({
      success: true,
      id: result.insertId
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= INVENTORY ================= */
app.get('/inventory', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM inventory');
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.put('/customers/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;

    const {
      shop_name,
      owner_name,
      phone,
      email,
      address,
      area,
      credit_limit
    } = req.body;

    await db.query(
      `UPDATE customers
       SET shop_name = ?, owner_name = ?, phone = ?, email = ?, address = ?, area = ?, credit_limit = ?
       WHERE id = ?`,
      [shop_name, owner_name, phone, email, address, area, credit_limit, id]
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/customers/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/customers/:id/pay', verifyToken, async (req, res) => {
  const conn = await db.getConnection();
  try {
    const id = req.params.id;
    const amount = parseFloat(req.body.amount) || 0;

    if (amount <= 0) {
      conn.release();
      return res.status(400).json({ message: 'Invalid amount' });
    }

    await conn.beginTransaction();

    const [[cust]] = await conn.query(
      'SELECT outstanding_balance FROM customers WHERE id = ? FOR UPDATE',
      [id]
    );

    if (!cust) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({ message: 'Customer not found' });
    }

    const newDue = Math.max(0, cust.outstanding_balance - amount);

    await conn.query(
      'UPDATE customers SET outstanding_balance = ? WHERE id = ?',
      [newDue, id]
    );

    await conn.commit();
    conn.release();

    res.json({ success: true, newDue });
  } catch (err) {
    try { await conn.rollback(); } catch {}
    conn.release();
    res.status(500).json({ message: err.message });
  }
});

app.post('/sales', verifyToken, async (req, res) => {
  const conn = await db.getConnection();

  try {
    const {
      customer_id,
      product_name,
      quantity,
      price_per_case,
      total_amount,
      amount_paid,
      payment_mode,
      notes
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ message: 'Customer required' });
    }

    const total = parseFloat(total_amount) || 0;
    const paid = parseFloat(amount_paid) || 0;

    await conn.beginTransaction();

    // 1️⃣ Insert into sales table
    await conn.query(
      `INSERT INTO sales 
(customer_id, product_name, quantity, price_per_case, total_amount, amount_paid, payment_mode, notes)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_id, product_name, quantity, price_per_case, total, paid, payment_mode, notes]
    );

    // 2️⃣ Calculate due
    const due = Math.max(0, total - paid);

    // 3️⃣ Update customer outstanding

    if (due > 0) {
      // Customer still owes money
      await conn.query(
        `UPDATE customers 
         SET outstanding_balance = outstanding_balance + ? 
         WHERE id = ?`,
        [due, customer_id]
      );
    } else if (due < 0) {
      // Customer paid extra → reduce outstanding
      const extra = Math.abs(due);
    
      await conn.query(
        `UPDATE customers 
         SET outstanding_balance = GREATEST(0, outstanding_balance - ?) 
         WHERE id = ?`,
        [extra, customer_id]
      );
    }

    await conn.commit();
    conn.release();

    res.json({ success: true });

  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ message: err.message });
  }
});

app.get('/sales', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        s.id,
        s.customer_id,
        s.product_name,
        s.quantity,
        s.price_per_case,
        s.total_amount,
        s.amount_paid,
        s.payment_mode,
        s.notes,
        DATE(s.created_at) AS date,
        c.shop_name AS customer_name
      FROM sales s
      LEFT JOIN customers c ON c.id = s.customer_id
      ORDER BY s.id DESC
    `);
    res.set('Cache-Control', 'no-store');
    res.json(rows);

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/sales/:id', verifyToken, async (req, res) => {
  try {
    const id = req.params.id;

    await db.query('DELETE FROM sales WHERE id = ?', [id]);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= deliveries ================= */

app.get('/deliveries', verifyToken, async (req, res) => {
  try {
    let query = `
      SELECT d.*, c.shop_name AS customer_name
      FROM deliveries d
      LEFT JOIN customers c ON d.customer_id = c.id
    `;

    
    const params = [];

    if (req.query.status && req.query.status !== "") {
      query += ` WHERE TRIM(LOWER(d.status)) = TRIM(LOWER(?))`;
      params.push(req.query.status);
    }

    query += ` ORDER BY d.id DESC`;
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/deliveries', verifyToken, async (req, res) => {
  
  try {
    const {
      customer_id,
      product_name,
      quantity,
      delivery_date,
      driver_name,
      vehicle_no,
      status,
      notes
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ message: 'Customer required' });
    }

    await db.query(
      `INSERT INTO deliveries 
      (customer_id, product_name, quantity, delivery_date, driver_name, vehicle_no, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        customer_id,
        product_name,
        quantity || 0,
        delivery_date,
        driver_name,
        vehicle_no,
        status || 'Pending',
        notes
      ]
    );

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/deliveries/:id', async (req, res) => {
  const { id } = req.params;
  await db.query('DELETE FROM deliveries WHERE id = ?', [id]);
  res.json({ success: true });
});

/* ================= DASHBOARD ================= */
// AI-Generated Code - 2026-05-02 - Claude Opus 4.7

app.get('/dashboard/recent-sales', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT s.id, s.total_amount, s.created_at,
             c.shop_name AS customer_name
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.id DESC
      LIMIT 5
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/dashboard/top-customers', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT c.shop_name AS customer_name,
             SUM(s.total_amount) AS total
      FROM sales s
      JOIN customers c ON s.customer_id = c.id
      GROUP BY s.customer_id
      ORDER BY total DESC
      LIMIT 5
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/dashboard/today-revenue', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT SUM(total_amount) AS todayRevenue
      FROM sales
      WHERE DATE(created_at) = CURDATE()
    `);
    res.json({ todayRevenue: rows[0].todayRevenue || 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.get('/dashboard/weekly-sales', verifyToken, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT DAYNAME(created_at) AS day,
             SUM(total_amount) AS total
      FROM sales
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY day
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= SERVER ================= */
app.listen(3000, () => {
  console.log('Server running on port 3000 🚀');
});