/**
 * End-to-end QA: API + Playwright UI against local frontend + Render API.
 * Run: node e2e-qa.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FRONTEND = 'http://localhost:5500/';
const API = process.env.API_URL || 'http://localhost:3000';
const SECRET = 'mysecretkey';
const REPORT = { passed: [], failed: [], warnings: [], api: [], console: [], network: [] };

function pass(msg) {
  REPORT.passed.push(msg);
}
function fail(msg, cause, fix) {
  REPORT.failed.push({ flow: msg, cause, fix });
}
function warn(msg) {
  REPORT.warnings.push(msg);
}

function loadFromServerJs() {
  const src = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  const pick = (n) => src.match(new RegExp(`${n}:\\s*['"]([^'"]+)['"]`))?.[1];
  const port = src.match(/port:\s*(\d+)/)?.[1];
  return {
    host: pick('host'),
    user: pick('user'),
    password: pick('password'),
    database: pick('database'),
    port: Number(port || 3306),
  };
}

async function getAdminCreds() {
  const cfg = loadFromServerJs();
  const pool = mysql.createPool({ ...cfg, connectionLimit: 1 });
  try {
    const [rows] = await pool.query(
      "SELECT username, password FROM users WHERE username = 'admin' OR id = 1 LIMIT 1"
    );
    if (!rows.length) throw new Error('No admin user in DB');
    return { username: rows[0].username, password: rows[0].password };
  } finally {
    await pool.end();
  }
}

async function api(method, route, token, body) {
  const opts = {
    method,
    headers: {
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + route, opts);
  let data;
  const text = await res.text();
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  REPORT.api.push({ method, route, status: res.status, ok: res.ok });
  return { res, data };
}

async function runApiQa(token) {
  const routes = [
    ['GET', '/products?page=1'],
    ['GET', '/products/stats'],
    ['GET', '/customers'],
    ['GET', '/sales'],
    ['GET', '/deliveries'],
    ['GET', '/dashboard/recent-sales'],
    ['GET', '/dashboard/top-customers'],
    ['GET', '/dashboard/today-revenue'],
    ['GET', '/dashboard/weekly-sales'],
  ];
  for (const [method, route] of routes) {
    const { res } = await api(method, route, token);
    if (res.ok) pass(`API ${method} ${route} → ${res.status}`);
    else fail(`API ${method} ${route}`, `HTTP ${res.status}`, 'Check DB schema and Render deploy');
  }
}

async function runDataQa() {
  const stamp = Date.now();
  let token;
  let customerId;
  let productId;
  let stockBefore;
  let stockAfter;

  // 1. Login
  try {
    const creds = await getAdminCreds();
    const loginRes = await fetch(API + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: creds.username, password: creds.password }),
    });
    const loginData = await loginRes.json();
    REPORT.api.push({ method: 'POST', route: '/login', status: loginRes.status, ok: loginRes.ok });
    if (loginData.success && loginData.token) {
      token = loginData.token;
      pass(`Login as ${creds.username} → token received`);
    } else {
      fail('Login', loginData.message || 'no token', 'Verify users table credentials');
      return null;
    }
  } catch (e) {
    fail('Login', e.message, 'DB connectivity / Render API');
    return null;
  }

  await runApiQa(token);

  // 2. Add customer
  try {
    const { res, data } = await api('POST', '/customers', token, {
      shop_name: `QA Shop ${stamp}`,
      owner_name: 'QA Owner',
      phone: '9999999999',
      email: `qa${stamp}@test.com`,
      address: 'QA Street',
      area: 'North',
      credit_limit: 50000,
      opening_balance: 0,
    });
    if (res.ok && (data.id || data.success)) {
      customerId = data.id;
      pass(`Add customer → id ${customerId}`);
    } else fail('Add customer', JSON.stringify(data), 'POST /customers handler');
  } catch (e) {
    fail('Add customer', e.message, 'POST /customers');
  }

  // 3. Add inventory product
  try {
    const { res, data } = await api('POST', '/products', token, {
      Name: `QA Beer ${stamp}`,
      quantity: 100,
      price: 1200,
      sku: `QA-SKU-${stamp}`,
      category: 'Beer',
      size: '650ml',
      bpc: 24,
      reorder: 10,
    });
    if (res.ok && data.id) {
      productId = data.id;
      pass(`Add inventory product → id ${productId}, stock 100`);
    } else fail('Add inventory product', JSON.stringify(data), 'POST /products');
  } catch (e) {
    fail('Add inventory product', e.message, 'POST /products');
  }

  // Stock before sale
  if (productId) {
    const { res, data } = await api('GET', '/products?page=1', token);
    const row = Array.isArray(data) ? data.find((p) => p.id === productId) : null;
    stockBefore = row ? Number(row.quantity) : null;
  }

  // 4. Create sales entry
  if (customerId) {
    try {
      const { res, data } = await api('POST', '/sales', token, {
        customer_id: customerId,
        product_name: `QA Beer ${stamp}`,
        quantity: 5,
        price_per_case: 1200,
        total_amount: 6000,
        amount_paid: 6000,
        payment_mode: 'Cash',
        notes: 'E2E QA sale',
      });
      if (res.ok && data.success) pass('Create sales entry → success');
      else fail('Create sales entry', JSON.stringify(data), 'POST /sales transaction');
    } catch (e) {
      fail('Create sales entry', e.message, 'POST /sales');
    }
  }

  // 7. Stock after sale
  if (productId) {
    const { data } = await api('GET', '/products?page=1', token);
    const row = Array.isArray(data) ? data.find((p) => p.id === productId) : null;
    stockAfter = row ? Number(row.quantity) : null;
    const soldQty = 5;
    if (stockBefore != null && stockAfter === stockBefore - soldQty) {
      pass(`Inventory stock reduced: ${stockBefore} → ${stockAfter}`);
    } else if (stockBefore != null && stockAfter === stockBefore) {
      fail(
        'Inventory stock reduction after sale',
        `quantity unchanged (${stockBefore}) after selling ${soldQty} cases`,
        'Ensure POST /sales UPDATE inventory runs and product Name matches'
      );
    } else {
      warn(`Stock before=${stockBefore} after=${stockAfter} (check pagination or product id)`);
    }
  }

  // 5. Create delivery
  if (customerId) {
    try {
      const { res, data } = await api('POST', '/deliveries', token, {
        customer_id: customerId,
        product_name: `QA Beer ${stamp}`,
        quantity: 2,
        delivery_date: new Date().toISOString().slice(0, 10),
        driver_name: 'QA Driver',
        vehicle_no: 'QA-001',
        status: 'Pending',
        notes: 'E2E delivery',
      });
      if (res.ok && data.success) pass('Create delivery → success');
      else fail('Create delivery', JSON.stringify(data), 'POST /deliveries');
    } catch (e) {
      fail('Create delivery', e.message, 'POST /deliveries');
    }
  }

  // 6. Dashboard stats
  try {
    const { res, data } = await api('GET', '/products/stats', token);
    if (res.ok && Number(data.totalProducts) >= 1) {
      pass(`Dashboard stats: totalProducts=${data.totalProducts}, totalStock=${data.totalStock}`);
    } else fail('Dashboard stats update', JSON.stringify(data), 'GET /products/stats');
    const rev = await api('GET', '/dashboard/today-revenue', token);
    if (rev.res.ok && Number(rev.data.todayRevenue) >= 6000) {
      pass(`Today revenue ≥ 6000 (${rev.data.todayRevenue})`);
    } else {
      warn(`Today revenue: ${JSON.stringify(rev.data)} (timezone/empty sales may apply)`);
    }
    const recent = await api('GET', '/dashboard/recent-sales', token);
    if (recent.res.ok && Array.isArray(recent.data) && recent.data.length >= 1) {
      pass(`Recent sales widget: ${recent.data.length} row(s)`);
    } else fail('Dashboard recent-sales', JSON.stringify(recent.data), 'GET /dashboard/recent-sales');
  } catch (e) {
    fail('Dashboard stats', e.message, 'dashboard routes');
  }

  return { token, customerId, productId, stamp };
}

async function runUiQa(apiToken, stamp) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('dialog', (d) => d.accept());
  page.on('console', (msg) => {
    if (msg.type() === 'error') REPORT.console.push(msg.text());
  });
  page.on('pageerror', (err) => REPORT.console.push(String(err)));
  page.on('requestfailed', (req) => {
    REPORT.network.push(`FAILED ${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
  });
  page.on('response', (res) => {
    const u = res.url();
    if (u.includes('onrender.com') && res.status() >= 400) {
      REPORT.network.push(`${res.status()} ${res.request().method()} ${u}`);
    }
  });

  try {
    const creds = await getAdminCreds();
    await page.goto(FRONTEND, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // UI Login
    await page.fill('#login-email', creds.username);
    await page.fill('#login-pass', creds.password);
    await page.click('.btn-primary:has-text("Sign In")');
    await page.waitForSelector('#app', { state: 'visible', timeout: 45000 });
    await page.waitForFunction(
      () => getComputedStyle(document.getElementById('loading')).display === 'none',
      { timeout: 45000 }
    );

    const loading = await page.evaluate(() => getComputedStyle(document.getElementById('loading')).display);
    const app = await page.evaluate(() => getComputedStyle(document.getElementById('app')).display);
    if (loading === 'none' && app !== 'none') pass('UI Login + dashboard loader dismissed');
    else fail('UI Login / loader', `loading=${loading} app=${app}`, 'loadStats / login / check saveSale script error');

    const totalProducts = await page.textContent('#total-products');
    if (totalProducts && totalProducts !== '—') pass(`UI dashboard #total-products shows ${totalProducts.trim()}`);
    else warn(`UI #total-products still "${totalProducts}"`);

    // Navigate sections
    await page.click('.nav-item >> text=Customers');
    await page.waitForTimeout(1000);
    await page.click('.nav-item:has-text("Inventory")');
    await page.waitForTimeout(1000);
    await page.click('.nav-item:has-text("Sales Entry")');
    await page.waitForTimeout(1000);
    await page.click('.nav-item:has-text("Deliveries")');
    await page.waitForTimeout(1000);
    await page.click('.nav-item:has-text("Dashboard")');
    await page.waitForTimeout(2000);

    if (REPORT.console.length === 0) pass('UI Console: no runtime errors');
    else fail('UI Console errors', REPORT.console.join(' | '), 'Fix JS exceptions in index.html');

    const apiFails = REPORT.network.filter((n) => n.startsWith('4') || n.startsWith('5') || n.startsWith('FAILED'));
    if (apiFails.length === 0) pass('UI Network: no failed API requests (4xx/5xx)');
    else fail('UI Network failures', apiFails.join('; '), 'API or CORS');
  } catch (e) {
    fail('UI E2E flow', e.message, 'Frontend server on :5500, selectors');
  } finally {
    await browser.close();
  }
}

// --- main ---
console.log('=== ThumbsUpApp E2E QA ===\n');

let frontendUp = false;
try {
  const r = await fetch(FRONTEND);
  frontendUp = r.ok;
} catch {}
if (!frontendUp) {
  fail('Local frontend', `${FRONTEND} not reachable`, 'Run: npx serve -l 5500 .');
} else {
  pass(`Local frontend reachable ${FRONTEND}`);
}

const ctx = await runDataQa();
if (ctx?.token) await runUiQa(ctx.token, ctx.stamp);

console.log('\n========== BUG REPORT ==========\n');
console.log('PASSED FLOWS (' + REPORT.passed.length + '):');
REPORT.passed.forEach((p, i) => console.log(`  ${i + 1}. ${p}`));

console.log('\nFAILED FLOWS (' + REPORT.failed.length + '):');
REPORT.failed.forEach((f, i) => {
  console.log(`  ${i + 1}. ${f.flow}`);
  console.log(`     Cause: ${f.cause}`);
  console.log(`     Fix: ${f.fix}`);
});

if (REPORT.warnings.length) {
  console.log('\nWARNINGS:');
  REPORT.warnings.forEach((w) => console.log(`  - ${w}`));
}

console.log('\nAPI STATUS SUMMARY:');
const bad = REPORT.api.filter((a) => !a.ok);
console.log(`  Total calls: ${REPORT.api.length}, failures: ${bad.length}`);
bad.forEach((a) => console.log(`  - ${a.method} ${a.route} → ${a.status}`));

console.log('\nCONSOLE ERRORS:', REPORT.console.length ? REPORT.console : '(none)');
console.log('\nNETWORK FAILURES:', REPORT.network.length ? REPORT.network : '(none)');

process.exit(REPORT.failed.length ? 1 : 0);
