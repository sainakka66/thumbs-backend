/**
 * Steps 3–4: create sales then deliveries (FK → customers.id).
 * Non-destructive. Does not touch inventory/customers. Never DROP.
 *
 * Usage:
 *   node create_sales_deliveries.js --allow-server-js-config
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const SALES_CREATE_SQL = `
CREATE TABLE IF NOT EXISTS \`sales\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`customer_id\` INT NOT NULL,
  \`product_name\` VARCHAR(255) NULL,
  \`quantity\` INT NULL DEFAULT 0,
  \`price_per_case\` DECIMAL(12,2) NULL DEFAULT 0.00,
  \`total_amount\` DECIMAL(12,2) NULL DEFAULT 0.00,
  \`amount_paid\` DECIMAL(12,2) NULL DEFAULT 0.00,
  \`payment_mode\` VARCHAR(50) NULL,
  \`notes\` TEXT NULL,
  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_sales_customer_id\` (\`customer_id\`),
  KEY \`idx_sales_created_at\` (\`created_at\`),
  CONSTRAINT \`fk_sales_customer\`
    FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
`.trim();

const DELIVERIES_CREATE_SQL = `
CREATE TABLE IF NOT EXISTS \`deliveries\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`customer_id\` INT NOT NULL,
  \`product_name\` VARCHAR(255) NULL,
  \`quantity\` INT NULL DEFAULT 0,
  \`delivery_date\` DATE NULL,
  \`driver_name\` VARCHAR(100) NULL,
  \`vehicle_no\` VARCHAR(30) NULL,
  \`status\` VARCHAR(50) NOT NULL DEFAULT 'Pending',
  \`notes\` TEXT NULL,
  PRIMARY KEY (\`id\`),
  KEY \`idx_deliveries_customer_id\` (\`customer_id\`),
  KEY \`idx_deliveries_status\` (\`status\`),
  KEY \`idx_deliveries_delivery_date\` (\`delivery_date\`),
  CONSTRAINT \`fk_deliveries_customer\`
    FOREIGN KEY (\`customer_id\`) REFERENCES \`customers\` (\`id\`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
`.trim();

const VERIFY_QUERIES = {
  'GET /sales list': `
    SELECT s.id, s.customer_id, s.product_name, s.quantity, s.price_per_case,
           s.total_amount, s.amount_paid, s.payment_mode, s.notes,
           DATE(s.created_at) AS date, c.shop_name AS customer_name
    FROM sales s
    LEFT JOIN customers c ON c.id = s.customer_id
    ORDER BY s.id DESC`,
  'GET /deliveries list': `
    SELECT d.*, c.shop_name AS customer_name
    FROM deliveries d
    LEFT JOIN customers c ON d.customer_id = c.id
    ORDER BY d.id DESC`,
  'GET /dashboard/recent-sales': `
    SELECT s.id, s.total_amount, s.created_at, c.shop_name AS customer_name
    FROM sales s
    LEFT JOIN customers c ON s.customer_id = c.id
    ORDER BY s.id DESC LIMIT 5`,
  'GET /dashboard/top-customers': `
    SELECT c.shop_name AS customer_name, SUM(s.total_amount) AS total
    FROM sales s
    JOIN customers c ON s.customer_id = c.id
    GROUP BY s.customer_id
    ORDER BY total DESC LIMIT 5`,
  'GET /dashboard/today-revenue': `
    SELECT SUM(total_amount) AS todayRevenue
    FROM sales WHERE DATE(created_at) = CURDATE()`,
  'GET /dashboard/weekly-sales': `
    SELECT DAYNAME(created_at) AS day, SUM(total_amount) AS total
    FROM sales
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    GROUP BY day`,
};

const RECOVERED_APIS = [
  'GET    /sales',
  'POST   /sales',
  'DELETE /sales/:id',
  'GET    /deliveries',
  'POST   /deliveries',
  'DELETE /deliveries/:id',
  'GET    /dashboard/recent-sales',
  'GET    /dashboard/top-customers',
  'GET    /dashboard/today-revenue',
  'GET    /dashboard/weekly-sales',
];

function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function parseDatabaseUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port || 3306),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: u.pathname.replace(/^\//, ''),
  };
}

function loadFromServerJs() {
  const src = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  const pick = (name) => {
    const m = src.match(new RegExp(`${name}:\\s*['"]([^'"]+)['"]`));
    return m ? m[1] : null;
  };
  const port = src.match(/port:\s*(\d+)/);
  const secret = src.match(/const SECRET = ["']([^"']+)["']/);
  const host = pick('host');
  const user = pick('user');
  const password = pick('password');
  const database = pick('database');
  if (!host || !user || !password || !database) {
    throw new Error('Could not parse mysql pool from server.js');
  }
  return {
    host,
    user,
    password,
    database,
    port: port ? Number(port[1]) : 3306,
    jwtSecret: secret ? secret[1] : null,
  };
}

function getConfig(allowServerJs) {
  loadDotEnv();
  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (url) return { source: 'DATABASE_URL', ...parseDatabaseUrl(url), jwtSecret: process.env.JWT_SECRET };

  const host = process.env.MYSQLHOST || process.env.MYSQL_HOST;
  const user = process.env.MYSQLUSER || process.env.MYSQL_USER;
  const password = process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE;
  const port = process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306';
  if (host && user && password && database) {
    return {
      source: 'MYSQL_*',
      host,
      user,
      password,
      database,
      port: Number(port),
      jwtSecret: process.env.JWT_SECRET,
    };
  }

  if (allowServerJs) return { source: 'server.js', ...loadFromServerJs() };
  throw new Error('No DB config. Use DATABASE_URL, MYSQL*, .env, or --allow-server-js-config');
}

async function ensureTable(pool, tableName, createSql) {
  const [tables] = await pool.query('SHOW TABLES');
  const names = tables.map((r) => Object.values(r)[0]);
  if (names.includes(tableName)) {
    console.log(`\n${tableName} already exists — skipping CREATE (no DROP).`);
    return { created: false };
  }
  console.log(`\n--- Executed SQL: ${tableName} ---\n`);
  console.log(createSql);
  console.log('\n--- end SQL ---\n');
  await pool.query(createSql);
  console.log(`CREATE ${tableName} completed (IF NOT EXISTS).`);
  return { created: true };
}

async function runVerifyQueries(pool) {
  console.log('\n=== Lightweight SQL verification (server.js parity) ===\n');
  let allOk = true;
  for (const [label, sql] of Object.entries(VERIFY_QUERIES)) {
    try {
      const [rows] = await pool.query(sql);
      console.log(`OK  ${label}  →  rows: ${rows.length}`);
    } catch (err) {
      allOk = false;
      console.log(`FAIL  ${label}`);
      console.log(`      code: ${err.code}`);
      console.log(`      message: ${err.message}`);
      if (err.sql) console.log(`      sql: ${String(err.sql).slice(0, 200)}...`);
    }
  }
  return allOk;
}

async function verifyLiveApis(jwtSecret) {
  const base = 'https://thumbs-backend.onrender.com';
  const token = jwt.sign({ id: 1, username: 'admin' }, jwtSecret, { expiresIn: '1h' });
  const routes = [
    '/sales',
    '/deliveries',
    '/dashboard/recent-sales',
    '/dashboard/top-customers',
    '/dashboard/today-revenue',
    '/dashboard/weekly-sales',
    '/products/stats',
    '/customers',
  ];

  console.log('\n=== Live API verification (Render, Bearer JWT) ===\n');
  let allOk = true;
  for (const route of routes) {
    try {
      const res = await fetch(base + route, {
        headers: { Authorization: 'Bearer ' + token },
      });
      const text = await res.text();
      const preview = text.length > 80 ? text.slice(0, 80) + '…' : text;
      const status = res.status;
      if (status >= 500) allOk = false;
      console.log(`${status >= 400 ? 'FAIL' : 'OK '}  ${status}  GET ${route}  →  ${preview}`);
    } catch (err) {
      allOk = false;
      console.log(`FAIL  GET ${route}  →  ${err.message}`);
    }
  }
  return allOk;
}

async function main() {
  const allowServerJs = process.argv.includes('--allow-server-js-config');
  const cfg = getConfig(allowServerJs);

  console.log('=== ThumbsUpApp — sales + deliveries (Steps 3–4) ===\n');
  console.log('Config source:', cfg.source);
  console.log('Connection:', `${cfg.host}:${cfg.port} / ${cfg.database}\n`);

  const pool = mysql.createPool({
    host: cfg.host,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    port: cfg.port,
    connectionLimit: 2,
  });

  try {
    const [[ping]] = await pool.query('SELECT 1 AS ok');
    console.log('Connection success:', ping.ok === 1);

    const [pre] = await pool.query('SHOW TABLES');
    const preNames = pre.map((r) => Object.values(r)[0]);
    if (!preNames.includes('customers')) {
      throw new Error('customers table missing — run Step 2 first');
    }
    console.log('Prerequisite customers: OK');
    console.log('inventory/customers: left untouched\n');

    await ensureTable(pool, 'sales', SALES_CREATE_SQL);
    await ensureTable(pool, 'deliveries', DELIVERIES_CREATE_SQL);

    const [tables] = await pool.query('SHOW TABLES');
    console.log('\n--- SHOW TABLES ---');
    for (const row of tables) console.log(' -', Object.values(row)[0]);

    const [salesDesc] = await pool.query('DESCRIBE sales');
    console.log('\n--- DESCRIBE sales ---');
    console.table(salesDesc);

    const [delDesc] = await pool.query('DESCRIBE deliveries');
    console.log('\n--- DESCRIBE deliveries ---');
    console.table(delDesc);

    console.log('\n--- Affected APIs expected to recover (200, empty data OK) ---');
    for (const line of RECOVERED_APIS) console.log(' ', line);

    console.log('\n--- Remaining endpoints expected to fail ---');
    console.log('  (none — full schema recovery complete for app routes)');
    console.log('  Note: DELETE /deliveries/:id has no verifyToken in server.js (auth gap, not schema).');

    const sqlOk = await runVerifyQueries(pool);

    if (cfg.jwtSecret) {
      await verifyLiveApis(cfg.jwtSecret);
    } else {
      console.log('\n(Skip live API check — JWT secret not available)');
    }

    if (!sqlOk) {
      console.log('\n⚠ Some verification queries failed. See errors above. No auto-fix applied.');
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }

  console.log('\nDone. No seed data. No DROP. inventory/customers untouched.');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
