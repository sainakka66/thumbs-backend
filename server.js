const http = require('http');
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { setPool } = require('./lib/db');
const { mountPayments, mountWebhook } = require('./payments');
const { attachSocketIO } = require('./payments/socket');
const loadBusinessUser = require('./lib/rbac/loadBusinessUser');
const { requirePermission } = require('./lib/rbac/requirePermission');
const { writeAudit } = require('./lib/audit/auditService');
const { loadPermissionsForUser } = require('./lib/rbac/permissionCache');
const { normalizeRoleSlug } = require('./lib/rbac/roleMap');
const { mountBusiness } = require('./business');
const notificationService = require('./business/services/notificationService');
const stockAlertService = require('./business/services/stockAlertService');
const {
  getDbConfig,
  getJwtSecret,
  getJwtExpiresIn,
  getCorsOrigins,
  isUsernameDisabled,
  isBcryptHash,
} = require('./config');

let SECRET;
try {
  SECRET = getJwtSecret();
} catch (err) {
  console.error('FATAL JWT_SECRET:', err.stack || err.message);
  process.exit(1);
}

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
const INVALID_LOGIN_MESSAGE = 'Invalid username or password.';
const loginFlow = require('./lib/security/loginFlow');
const loginProtection = require('./lib/security/loginProtectionService');

/** Ensure async route errors reach JSON error handler (never HTML). */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

function sendJsonError(res, status, message, err) {
  if (res.headersSent) return;
  res.status(status).json({ success: false, message });
  if (err) console.error('[API error]', err.stack || err.message);
}

const app = express();
app.set('trust proxy', 1);
app.use(
  helmet({
    hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
  })
);
app.use(
  cors({
    origin(origin, callback) {
      const allowed = getCorsOrigins();
      // No Origin header (curl, same-origin) — allow
      if (!origin) {
        return callback(null, true);
      }
      if (allowed.includes(origin)) {
        return callback(null, true);
      }
      console.warn(`CORS blocked origin: ${origin} (allowed: ${allowed.join(', ')})`);
      // Use false, not Error — Error caused HTTP 500 on preflight
      return callback(null, false);
    },
    credentials: true,
  })
);
const dbConfig = getDbConfig();
if (!dbConfig) {
  console.error(
    'Database not configured. Set DATABASE_URL or MYSQL* environment variables.'
  );
  process.exit(1);
}
const db = mysql.createPool(dbConfig);
setPool(db);

const httpServer = http.createServer(app);
let paymentIo = null;
try {
  paymentIo = attachSocketIO(httpServer, {
    jwtSecret: SECRET,
    corsOrigins: getCorsOrigins(),
  });
} catch (err) {
  console.warn('Socket.IO disabled:', err.message);
}

mountWebhook(app, paymentIo);

app.use(express.json({ limit: '100kb' }));

const { limiters: enterpriseLimiters } = require('./lib/rateLimit/enterpriseLimiter');
const loginLimiter = enterpriseLimiters.login;

/* ================= TOKEN ================= */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(403).json('No token');

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(403).json('No token');

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) return res.status(401).json('Invalid token');
    req.user = decoded;
    loadBusinessUser(req, res, next);
  });
}

/** Permission gate — use after verifyToken (loads business user). */
function enforce(...permissions) {
  return requirePermission(...permissions);
}

async function verifyPassword(plain, stored) {
  if (plain == null || stored == null || stored === undefined) {
    return false;
  }
  const plainStr = String(plain);
  const storedStr = Buffer.isBuffer(stored) ? stored.toString('utf8') : String(stored);

  try {
    if (isBcryptHash(storedStr)) {
      return await bcrypt.compare(plainStr, storedStr);
    }
    if (plainStr === storedStr) {
      return 'legacy';
    }
    return false;
  } catch (err) {
    console.error('verifyPassword:', err.message);
    return false;
  }
}

/* ================= HEALTH (diagnostics) ================= */
app.get('/health', asyncHandler(async (_req, res) => {
  await db.query('SELECT 1');
  let userCount = 0;
  try {
    const [rows] = await db.query('SELECT COUNT(*) AS count FROM users');
    userCount = rows[0]?.count ?? 0;
  } catch (e) {
    console.warn('health: users table check failed:', e.message);
  }
  res.json({
    ok: true,
    database: 'connected',
    users: userCount,
    jwt: Boolean(SECRET),
  });
}));

/* ================= API DOCS (Swagger/OpenAPI) ================= */
const fs = require('fs');
const path = require('path');
let swaggerSpecCache = null;
function loadSwaggerSpec() {
  if (swaggerSpecCache) return swaggerSpecCache;
  try {
    swaggerSpecCache = JSON.parse(fs.readFileSync(path.join(__dirname, 'swagger.json'), 'utf8'));
  } catch (e) {
    swaggerSpecCache = { openapi: '3.0.3', info: { title: 'API', version: '0' }, paths: {} };
  }
  return swaggerSpecCache;
}

// Raw OpenAPI spec
app.get(['/api/docs.json', '/swagger.json'], (_req, res) => {
  res.json(loadSwaggerSpec());
});

// Swagger UI (served from CDN, no extra dependency)
app.get(['/api/docs', '/docs'], (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Thumbs Up API Docs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/api/docs.json',
        dom_id: '#swagger-ui',
        presets: [SwaggerUIBundle.presets.apis],
        layout: 'BaseLayout',
      });
    };
  </script>
</body>
</html>`);
});

/* ================= LOGIN ================= */
app.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    req.clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    req.deviceFingerprint = req.headers['x-device-fingerprint'] || null;
    req.userAgent = req.headers['user-agent'];

    const username = String(req.body?.username || '').trim();
    const password = req.body?.password;

    if (!username || password == null || password === '') {
      return res.status(400).json({ success: false, message: INVALID_LOGIN_MESSAGE });
    }

    const lock = await loginProtection.isAccountLocked(username);
    if (lock) {
      return res.status(429).json({
        success: false,
        message: 'Account temporarily locked. Try again later.',
        lockedUntil: lock.until,
      });
    }

    if (isUsernameDisabled(username)) {
      return res.status(403).json({ success: false, message: INVALID_LOGIN_MESSAGE });
    }

    let rows;
    try {
      [rows] = await db.query(
        `SELECT id, username, password, role, status, is_active, deleted_at
         FROM users WHERE username = ? LIMIT 1`,
        [username]
      );
    } catch (dbErr) {
      if (dbErr.code === 'ER_BAD_FIELD_ERROR') {
        [rows] = await db.query(
          'SELECT id, username, password FROM users WHERE username = ? LIMIT 1',
          [username]
        );
      } else {
        console.error('Login DB query failed:', dbErr.stack || dbErr.message);
        return sendJsonError(res, 503, 'Database unavailable. Try again later.', dbErr);
      }
    }

    if (!rows.length) {
      await loginProtection.recordLoginAttempt(req, {
        username,
        success: false,
        failureReason: 'unknown_user',
      });
      await loginProtection.checkAndMaybeLock(req, { username });
      return res.json({ success: false, message: INVALID_LOGIN_MESSAGE });
    }

    const user = rows[0];
    user.role = user.role || 'user';
    if (user.deleted_at || user.is_active === 0) {
      return res.status(403).json({ success: false, message: INVALID_LOGIN_MESSAGE });
    }
    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(403).json({ success: false, message: INVALID_LOGIN_MESSAGE });
    }

    const match = await verifyPassword(password, user.password);

    if (!match) {
      await loginProtection.recordLoginAttempt(req, {
        username,
        userId: user.id,
        success: false,
        failureReason: 'bad_password',
      });
      await loginProtection.checkAndMaybeLock(req, { username, userId: user.id });
      return res.json({ success: false, message: INVALID_LOGIN_MESSAGE });
    }

    if (match === 'legacy') {
      try {
        const hash = await bcrypt.hash(String(password), BCRYPT_ROUNDS);
        await db.query('UPDATE users SET password = ? WHERE id = ?', [hash, user.id]);
      } catch (hashErr) {
        console.error('Login password upgrade failed:', hashErr.stack || hashErr.message);
        return sendJsonError(res, 500, 'Unable to sign in. Try again later.', hashErr);
      }
    }

    return loginFlow.finalizeLogin(req, res, user);
  })
);

app.post(
  '/login/mfa/verify',
  loginLimiter,
  asyncHandler(async (req, res) => {
    req.clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
    req.deviceFingerprint = req.headers['x-device-fingerprint'] || null;
    req.userAgent = req.headers['user-agent'];
    const { pendingToken, code, method } = req.body || {};
    if (!pendingToken || !code) {
      return res.status(400).json({ success: false, message: 'pendingToken and code required' });
    }
    const result = await loginFlow.completeAuthChallenge(req, {
      pendingToken,
      code,
      method: method || 'email',
    });
    if (!result.success) return res.status(401).json(result);
    res.setHeader('Cache-Control', 'no-store');
    res.json(result);
  })
);

/* ================= LOGOUT ================= */
app.post('/logout', verifyToken, async (req, res) => {
  await writeAudit(req, { action: 'logout', entityType: 'user', entityId: req.user?.id });
  res.setHeader('Cache-Control', 'no-store');
  res.json({ success: true });
});

/* ================= PRODUCTS ================= */
app.get('/products', verifyToken, enforce('inventory.view'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT id, Name, quantity, price, sku, category, size, bpc, reorder
       FROM inventory ORDER BY id LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json(rows);

  } catch (err) {
    res.status(500).json(err);
  }
});

/* ================= SEARCH ================= */
app.get('/products/search/:key', verifyToken, enforce('inventory.view'), async (req, res) => {
  try {
    const key = req.params.key;
    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      `SELECT id, Name, quantity, price, sku, category, size, bpc, reorder
       FROM inventory 
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
app.post('/products', verifyToken, enforce('inventory.create'), async (req, res) => {
  try {
    const { Name, quantity, price, sku, category, size, bpc, reorder } = req.body;

    const [result] = await db.query(
      `INSERT INTO inventory 
      (Name, quantity, price, sku, category, size, bpc, reorder)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [Name, quantity, price, sku, category, size, bpc, reorder]
    );

    await writeAudit(req, {
      action: 'inventory_create',
      entityType: 'inventory',
      entityId: result.insertId,
      afterValue: { Name, quantity, sku },
    });
    await stockAlertService.syncStockAlerts().catch(() => {});
    res.json({ success: true, id: result.insertId });

  } catch (err) {
    res.status(500).json(err);
  }
});

/* ================= DELETE PRODUCT ================= */
app.delete('/products/:id', verifyToken, enforce('inventory.delete'), async (req, res) => {
  try {
    const id = req.params.id;

    await db.query('DELETE FROM inventory WHERE id = ?', [id]);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json(err);
  }
});

/* ================= UPDATE PRODUCT ================= */
app.put('/products/:id', verifyToken, enforce('inventory.update'), async (req, res) => {
  try {
    const id = req.params.id;
    const { Name, quantity, price, sku, category, size, bpc, reorder } = req.body;

    const [[before]] = await db.query('SELECT * FROM inventory WHERE id = ?', [id]);
    await db.query(
      `UPDATE inventory 
       SET Name=?, quantity=?, price=?, sku=?, category=?, size=?, bpc=?, reorder=?
       WHERE id=?`,
      [Name, quantity, price, sku, category, size, bpc, reorder, id]
    );

    await writeAudit(req, {
      action: 'inventory_update',
      entityType: 'inventory',
      entityId: id,
      beforeValue: before,
      afterValue: { Name, quantity, price, sku },
    });
    await stockAlertService.syncStockAlerts().catch(() => {});
    res.json({ success: true });

  } catch (err) {
    res.status(500).json(err);
  }
});

/* ================= STATS ================= */
app.get('/products/stats', verifyToken, enforce('inventory.view'), async (req, res) => {
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
app.get('/customers', verifyToken, enforce('customers.view'), async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, shop_name, owner_name, phone, email, address, area,
              credit_limit, opening_balance, outstanding_balance
       FROM customers ORDER BY shop_name`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/customers', verifyToken, enforce('customers.create'), async (req, res) => {
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

    await writeAudit(req, {
      action: 'customer_create',
      entityType: 'customer',
      entityId: result.insertId,
      afterValue: { shop_name },
    });
    await notificationService.createNotification({
      type: 'customer_added',
      title: 'New customer',
      message: `Customer ${shop_name} added`,
      entityType: 'customer',
      entityId: result.insertId,
    }).catch(() => {});
    res.json({
      success: true,
      id: result.insertId
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= INVENTORY ================= */
app.get('/inventory', verifyToken, enforce('inventory.view'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM inventory');
    res.json(rows);
  } catch (err) {
    res.status(500).json(err);
  }
});

app.put('/customers/:id', verifyToken, enforce('customers.update'), async (req, res) => {
  try {
    const id = req.params.id;

    const [[before]] = await db.query('SELECT * FROM customers WHERE id = ?', [id]);
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

    await writeAudit(req, {
      action: 'customer_update',
      entityType: 'customer',
      entityId: id,
      beforeValue: before,
      afterValue: { shop_name, phone },
    });
    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/customers/:id', verifyToken, enforce('customers.delete'), async (req, res) => {
  try {
    const id = req.params.id;
    await db.query('DELETE FROM customers WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/customers/:id/pay', verifyToken, enforce('customers.update'), async (req, res) => {
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

app.post('/sales', verifyToken, enforce('sales.create'), async (req, res) => {
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
      conn.release();
      return res.status(400).json({ message: 'Customer required' });
    }

    const total = parseFloat(total_amount) || 0;
    const paid = parseFloat(amount_paid) || 0;
    const soldQty = parseInt(quantity, 10) || 0;

    await conn.beginTransaction();

    // 1️⃣ Insert into sales table
    await conn.query(
      `INSERT INTO sales 
(customer_id, product_name, quantity, price_per_case, total_amount, amount_paid, payment_mode, notes)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customer_id, product_name, quantity, price_per_case, total, paid, payment_mode, notes]
    );

    // 2️⃣ Reduce inventory stock (match product Name; UI sends "Name (size)")
    if (soldQty > 0 && product_name) {
      const invName = String(product_name).includes('(')
        ? String(product_name).split('(')[0].trim()
        : String(product_name).trim();

      await conn.query(
        `UPDATE inventory 
         SET quantity = GREATEST(0, quantity - ?) 
         WHERE Name = ?`,
        [soldQty, invName]
      );
    }

    // 3️⃣ Calculate due
    const due = Math.max(0, total - paid);

    // 4️⃣ Update customer outstanding

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

    await writeAudit(req, {
      action: 'sale_create',
      entityType: 'sale',
      entityId: null,
      afterValue: { customer_id, product_name, total_amount: total },
    });
    await notificationService
      .createNotification({
        type: total >= 50000 ? 'large_sale' : 'new_sale',
        title: total >= 50000 ? 'Large sale recorded' : 'New sale',
        message: `Sale of ₹ ${total} — ${product_name}`,
        entityType: 'sale',
      })
      .catch(() => {});
    await stockAlertService.syncStockAlerts().catch(() => {});
    res.json({ success: true });

  } catch (err) {
    await conn.rollback();
    conn.release();
    res.status(500).json({ message: err.message });
  }
});

app.get('/sales', verifyToken, enforce('sales.view'), async (req, res) => {
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

app.delete('/sales/:id', verifyToken, enforce('sales.delete'), async (req, res) => {
  try {
    const id = req.params.id;

    await db.query('DELETE FROM sales WHERE id = ?', [id]);

    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= deliveries ================= */

app.get('/deliveries', verifyToken, enforce('deliveries.view', 'deliveries.view_own'), async (req, res) => {
  try {
    let query = `
      SELECT d.*, c.shop_name AS customer_name
      FROM deliveries d
      LEFT JOIN customers c ON d.customer_id = c.id
    `;

    
    const params = [];
    const where = [];

    if (req.roleSlug === 'DELIVERY_AGENT' && req.permissions.has('deliveries.view_own')) {
      where.push('d.assigned_user_id = ?');
      params.push(req.businessUser.id);
    }

    if (req.query.status && req.query.status !== "") {
      where.push('TRIM(LOWER(d.status)) = TRIM(LOWER(?))');
      params.push(req.query.status);
    }

    if (where.length) {
      query += ` WHERE ${where.join(' AND ')}`;
    }

    query += ` ORDER BY d.id DESC`;
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.post('/deliveries', verifyToken, enforce('deliveries.create'), async (req, res) => {
  
  try {
    const {
      customer_id,
      product_name,
      quantity,
      delivery_date,
      driver_name,
      vehicle_no,
      status,
      notes,
      assigned_user_id,
    } = req.body;

    if (!customer_id) {
      return res.status(400).json({ message: 'Customer required' });
    }

    const assignee =
      assigned_user_id ||
      (req.roleSlug === 'DELIVERY_AGENT' || req.roleSlug === 'DELIVERY' ? req.businessUser.id : null);
    const baseParams = [
      customer_id,
      product_name,
      quantity || 0,
      delivery_date,
      driver_name,
      vehicle_no,
      status || 'Pending',
      notes,
    ];
    try {
      await db.query(
        `INSERT INTO deliveries 
        (customer_id, assigned_user_id, product_name, quantity, delivery_date, driver_name, vehicle_no, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [customer_id, assignee, ...baseParams.slice(1)]
      );
    } catch (insErr) {
      if (insErr.code !== 'ER_BAD_FIELD_ERROR') throw insErr;
      await db.query(
        `INSERT INTO deliveries 
        (customer_id, product_name, quantity, delivery_date, driver_name, vehicle_no, status, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        baseParams
      );
    }

    const [ins] = await db.query('SELECT LAST_INSERT_ID() AS id');
    await writeAudit(req, {
      action: 'delivery_create',
      entityType: 'delivery',
      entityId: ins[0]?.id,
      afterValue: { customer_id, product_name, status: status || 'Pending' },
    });
    await notificationService
      .createNotification({
        type: 'new_delivery',
        title: 'New delivery scheduled',
        message: `Delivery #${ins[0]?.id} for ${product_name}`,
        entityType: 'delivery',
        entityId: ins[0]?.id,
      })
      .catch(() => {});
    res.json({ success: true });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

app.delete('/deliveries/:id', verifyToken, enforce('deliveries.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    await db.query('DELETE FROM deliveries WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= DASHBOARD ================= */
// AI-Generated Code - 2026-05-02 - Claude Opus 4.7

mountBusiness(app, { verifyToken, db });

app.get('/dashboard/recent-sales', verifyToken, enforce('dashboard.view'), async (req, res) => {
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

app.get('/dashboard/top-customers', verifyToken, enforce('dashboard.view'), async (req, res) => {
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

app.get('/dashboard/today-revenue', verifyToken, enforce('dashboard.view'), async (req, res) => {
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

app.get('/dashboard/weekly-sales', verifyToken, enforce('dashboard.view'), async (req, res) => {
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

mountPayments(app, { verifyToken, io: paymentIo });

/* ================= JSON ERROR HANDLERS (never HTML) ================= */
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
  }
  next(err);
});

app.use((err, req, res, _next) => {
  console.error('Unhandled error:', req.method, req.path, err.stack || err.message);
  if (err.status === 403 || err.name === 'ForbiddenError') {
    return res.status(403).json({ success: false, message: err.message || 'Forbidden' });
  }
  if (err.status === 401 || err.name === 'UnauthorizedError') {
    return res.status(401).json({ success: false, message: err.message || 'Unauthorized' });
  }
  sendJsonError(
    res,
    err.status || 500,
    err.status === 429
      ? 'Too many requests. Try again later.'
      : 'Internal server error'
  );
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Not found' });
});

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason?.stack || reason);
});

process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err.stack || err.message);
  process.exit(1);
});

/* ================= SERVER ================= */
const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} 🚀`);
  console.log(`DB host: ${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`);
  if (paymentIo) console.log('Socket.IO enabled for payment updates');
});