/**
 * One-off: create ONLY the customers table on Railway MySQL.
 * Non-destructive: CREATE TABLE IF NOT EXISTS; never DROP.
 * Does not touch inventory, sales, or deliveries.
 *
 * Usage:
 *   node create_customers.js
 *   node create_customers.js --allow-server-js-config
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const CUSTOMERS_CREATE_SQL = `
CREATE TABLE IF NOT EXISTS \`customers\` (
  \`id\` INT NOT NULL AUTO_INCREMENT,
  \`shop_name\` VARCHAR(255) NOT NULL,
  \`owner_name\` VARCHAR(255) NULL,
  \`phone\` VARCHAR(30) NULL,
  \`email\` VARCHAR(255) NULL,
  \`address\` TEXT NULL,
  \`area\` VARCHAR(100) NULL,
  \`credit_limit\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  \`opening_balance\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  \`outstanding_balance\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  PRIMARY KEY (\`id\`),
  KEY \`idx_customers_shop_name\` (\`shop_name\`),
  KEY \`idx_customers_area\` (\`area\`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci
`.trim();

const EXPECTED_COLUMNS = {
  id: { type: 'int', null: 'NO', key: 'PRI', extra: 'auto_increment' },
  shop_name: { type: 'varchar(255)', null: 'NO' },
  owner_name: { type: 'varchar(255)', null: 'YES' },
  phone: { type: 'varchar(30)', null: 'YES' },
  email: { type: 'varchar(255)', null: 'YES' },
  address: { type: 'text', null: 'YES' },
  area: { type: 'varchar(100)', null: 'YES' },
  credit_limit: { type: 'decimal(12,2)', null: 'NO', default: '0.00' },
  opening_balance: { type: 'decimal(12,2)', null: 'NO', default: '0.00' },
  outstanding_balance: { type: 'decimal(12,2)', null: 'NO', default: '0.00' },
};

const AFFECTED_APIS = [
  'GET    /customers          (server.js L183-189)',
  'POST   /customers          (server.js L192-229)',
  'PUT    /customers/:id      (server.js L241-267)',
  'DELETE /customers/:id      (server.js L269-277)',
  'POST   /customers/:id/pay  (server.js L279-319)',
];

const STILL_500_UNTIL_NEXT_STEPS = [
  'GET/POST /sales, DELETE /sales/:id  → needs sales table',
  'GET/POST /deliveries, DELETE /deliveries/:id  → needs deliveries table',
  'GET /dashboard/* (sales-based)  → needs sales table',
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
  if (url) return { source: 'DATABASE_URL', ...parseDatabaseUrl(url) };

  const host = process.env.MYSQLHOST || process.env.MYSQL_HOST;
  const user = process.env.MYSQLUSER || process.env.MYSQL_USER;
  const password = process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD;
  const database = process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE;
  const port = process.env.MYSQLPORT || process.env.MYSQL_PORT || '3306';
  if (host && user && password && database) {
    return { source: 'MYSQL_*', host, user, password, database, port: Number(port) };
  }

  if (allowServerJs) return { source: 'server.js (pool block)', ...loadFromServerJs() };

  throw new Error(
    'No database config. Set DATABASE_URL, MYSQL* vars, .env, or --allow-server-js-config'
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
    const baseExp = exp.type.split('(')[0];
    if (!a.type.startsWith(baseExp) && a.type !== exp.type) {
      problems.push(`type expected ${exp.type}, got ${a.type}`);
    }
    if (exp.null && a.null !== exp.null) problems.push(`NULL expected ${exp.null}, got ${a.null}`);
    if (exp.key && a.key !== exp.key) problems.push(`Key expected ${exp.key}, got ${a.key}`);
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

  console.log('=== ThumbsUpApp — customers table only (Step 2) ===\n');
  console.log('Config source:', cfg.source);
  console.log('Connection:', cfg.host + ':' + cfg.port, '/', cfg.database, '\n');

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
    console.log('Connection success:', ping.ok === 1, '\n');

    const [tablesBefore] = await pool.query('SHOW TABLES');
    const names = tablesBefore.map((r) => Object.values(r)[0]);
    const hadCustomers = names.includes('customers');

    if (!names.includes('inventory')) {
      console.log('Note: inventory table not present (unchanged by this script).\n');
    } else {
      console.log('inventory table present — left untouched.\n');
    }

    if (hadCustomers) {
      console.log('customers already exists — skipping CREATE (no DROP).\n');
      console.log('--- Schema comparison vs expected (Step 2) ---');
      const [desc] = await pool.query('DESCRIBE customers');
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
      console.log('--- Executed SQL ---\n');
      console.log(CUSTOMERS_CREATE_SQL);
      console.log('\n--- end SQL ---\n');
      await pool.query(CUSTOMERS_CREATE_SQL);
      console.log('CREATE completed (IF NOT EXISTS).\n');
    }

    const [tables] = await pool.query('SHOW TABLES');
    console.log('--- SHOW TABLES ---');
    for (const row of tables) console.log(' -', Object.values(row)[0]);

    const [desc] = await pool.query('DESCRIBE customers');
    console.log('\n--- DESCRIBE customers ---');
    console.table(desc);

    console.log('\n--- Affected APIs (should return 200 when table empty) ---');
    for (const line of AFFECTED_APIS) console.log(' ', line);

    console.log('\n--- Still 500 until sales/deliveries migration ---');
    for (const line of STILL_500_UNTIL_NEXT_STEPS) console.log(' ', line);
  } finally {
    await pool.end();
  }

  console.log('\nDone. Stopped after customers only.');
}

main().catch((err) => {
  console.error('Failed:', err.message);
  process.exit(1);
});
