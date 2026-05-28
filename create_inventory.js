/**
 * One-off: create ONLY the inventory table on Railway MySQL.
 * Non-destructive: CREATE TABLE IF NOT EXISTS; never DROP.
 *
 * Connection order:
 *   1) DATABASE_URL / MYSQL_URL
 *   2) MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT
 *   3) .env file in project root (if present)
 *   4) --allow-server-js-config  → parse mysql pool from server.js (no secrets added here)
 *
 * Usage:
 *   node create_inventory.js
 *   node create_inventory.js --allow-server-js-config
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const INVENTORY_CREATE_SQL = `
CREATE TABLE IF NOT EXISTS \`inventory\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`Name\` VARCHAR(255) NULL COMMENT 'Product name — capital N matches server.js',
  \`quantity\` DECIMAL(12,2) NULL DEFAULT 0.00,
  \`price\` DECIMAL(12,2) NULL DEFAULT 0.00,
  \`sku\` VARCHAR(100) NULL,
  \`category\` VARCHAR(100) NULL,
  \`size\` VARCHAR(50) NULL,
  \`bpc\` INT UNSIGNED NULL DEFAULT 24,
  \`reorder\` DECIMAL(12,2) NULL DEFAULT 10.00,
  PRIMARY KEY (\`id\`),
  KEY \`idx_inventory_sku\` (\`sku\`),
  KEY \`idx_inventory_name\` (\`Name\`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
`.trim();

const EXPECTED_COLUMNS = {
  id: { type: 'int', null: 'NO', key: 'PRI', extra: 'auto_increment' },
  Name: { type: 'varchar(255)', null: 'YES' },
  quantity: { type: 'decimal(12,2)', null: 'YES', default: '0.00' },
  price: { type: 'decimal(12,2)', null: 'YES', default: '0.00' },
  sku: { type: 'varchar(100)', null: 'YES' },
  category: { type: 'varchar(100)', null: 'YES' },
  size: { type: 'varchar(50)', null: 'YES' },
  bpc: { type: 'int unsigned', null: 'YES', default: '24' },
  reorder: { type: 'decimal(12,2)', null: 'YES', default: '10.00' },
};

function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
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
  const host = pick('host');
  const user = pick('user');
  const password = pick('password');
  const database = pick('database');
  if (!host || !user || !password || !database) {
    throw new Error('Could not parse mysql pool config from server.js');
  }
  return {
    host,
    user,
    password,
    database,
    port: port ? Number(port[1]) : 3306,
  };
}

function getConfig(allowServerJs) {
  loadDotEnv();

  const url = process.env.DATABASE_URL || process.env.MYSQL_URL;
  if (url) {
    return { source: 'DATABASE_URL', ...parseDatabaseUrl(url) };
  }

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
    };
  }

  if (allowServerJs) {
    return { source: 'server.js (pool block)', ...loadFromServerJs() };
  }

  throw new Error(
    'No database config found. Set DATABASE_URL or MYSQLHOST/MYSQLUSER/MYSQLPASSWORD/MYSQLDATABASE/MYSQLPORT, ' +
      'add a .env file, or pass --allow-server-js-config'
  );
}

function normalizeType(t) {
  return String(t || '').toLowerCase().replace(/\s+/g, ' ');
}

function compareSchema(describeRows) {
  const actual = {};
  for (const row of describeRows) {
    actual[row.Field] = {
      type: normalizeType(row.Type),
      null: row.Null,
      key: row.Key,
      default: row.Default == null ? null : String(row.Default),
      extra: row.Extra || '',
    };
  }

  const report = { ok: [], mismatch: [], missing: [], extra: [] };

  for (const [col, exp] of Object.entries(EXPECTED_COLUMNS)) {
    if (!actual[col]) {
      report.missing.push(col);
      continue;
    }
    const a = actual[col];
    const problems = [];
    if (!a.type.startsWith(exp.type.split('(')[0])) {
      if (a.type !== exp.type) problems.push(`type expected ~${exp.type}, got ${a.type}`);
    } else if (exp.type.includes('(') && a.type !== exp.type) {
      problems.push(`type expected ${exp.type}, got ${a.type}`);
    }
    if (exp.null && a.null !== exp.null) problems.push(`NULL expected ${exp.null}, got ${a.null}`);
    if (exp.key && a.key !== exp.key) problems.push(`Key expected ${exp.key}, got ${a.key}`);
    if (exp.extra && !a.extra.includes('auto_increment') && exp.extra.includes('auto_increment')) {
      problems.push(`Extra expected ${exp.extra}, got ${a.extra}`);
    }
    if (problems.length) report.mismatch.push({ column: col, problems });
    else report.ok.push(col);
  }

  for (const col of Object.keys(actual)) {
    if (!EXPECTED_COLUMNS[col]) report.extra.push(col);
  }

  return report;
}

async function main() {
  const allowServerJs = process.argv.includes('--allow-server-js-config');
  const cfg = getConfig(allowServerJs);

  console.log('=== ThumbsUpApp — inventory table only ===\n');
  console.log('Config source:', cfg.source);
  console.log('Host:', cfg.host);
  console.log('Port:', cfg.port);
  console.log('Database:', cfg.database);
  console.log('User:', cfg.user);
  console.log('(password hidden)\n');

  const pool = mysql.createPool({
    host: cfg.host,
    user: cfg.user,
    password: cfg.password,
    database: cfg.database,
    port: cfg.port,
    waitForConnections: true,
    connectionLimit: 2,
  });

  try {
    const [[ping]] = await pool.query('SELECT 1 AS ok, VERSION() AS version');
    console.log('Connection success:', ping.ok === 1);
    console.log('MySQL version:', ping.version, '\n');

    const [tablesBefore] = await pool.query('SHOW TABLES');
    const tableNamesBefore = tablesBefore.map((r) => Object.values(r)[0]);
    const hadInventory = tableNamesBefore.includes('inventory');

    if (hadInventory) {
      console.log('inventory already exists — skipping CREATE (no DROP).\n');
      console.log('--- Schema comparison vs expected (migrations/001-recovery-schema.sql Step 1) ---');
      const [desc] = await pool.query('DESCRIBE inventory');
      console.table(desc);
      const cmp = compareSchema(desc);
      console.log('Matching columns:', cmp.ok.join(', ') || '(none)');
      if (cmp.mismatch.length) {
        console.log('Mismatches:');
        for (const m of cmp.mismatch) console.log(' -', m.column, m.problems.join('; '));
      }
      if (cmp.missing.length) console.log('Missing columns:', cmp.missing.join(', '));
      if (cmp.extra.length) console.log('Extra columns:', cmp.extra.join(', '));
    } else {
      console.log('--- Executing SQL ---\n');
      console.log(INVENTORY_CREATE_SQL);
      console.log('\n--- end SQL ---\n');
      await pool.query(INVENTORY_CREATE_SQL);
      console.log('CREATE completed (IF NOT EXISTS).\n');
    }

    const [tables] = await pool.query('SHOW TABLES');
    console.log('--- SHOW TABLES ---');
    for (const row of tables) console.log(' -', Object.values(row)[0]);

    const [desc] = await pool.query('DESCRIBE inventory');
    console.log('\n--- DESCRIBE inventory ---');
    console.table(desc);
  } finally {
    await pool.end();
  }

  console.log('\nDone. Stopped after inventory (customers/sales/deliveries not created).');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
