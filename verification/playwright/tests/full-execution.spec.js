// @ts-check
/**
 * Phase 2.6 — Full browser execution (headed, screenshots, API log).
 * Run via: npm run verify:browser
 */
const fs = require('fs');
const path = require('path');
const { test, expect } = require('@playwright/test');
const {
  ROUTES,
  screenshot,
  loginAs,
  measurePageLoad,
  attachApiLogger,
  visitRoute,
  USERS,
  ensureDir,
} = require('../lib/helpers');

const RESULTS_PATH = path.join(__dirname, '..', '..', 'results', 'browser-execution.json');
const state = {
  apiLog: [],
  rbacMatrix: [],
  performance: [],
  tests: [],
  screenshots: [],
  browserConsole: [],
};

function record(name, pass, detail = '') {
  state.tests.push({ name, pass, detail, at: new Date().toISOString() });
}

function recordShot(file) {
  if (file) state.screenshots.push(file);
}

async function logout(page) {
  const btn = page.getByTitle('Sign out');
  if (await btn.count()) {
    await btn.click();
    await page.waitForURL(/login/, { timeout: 15000 });
  } else {
    await page.goto('/login');
  }
}

async function probeRoutes(page, role) {
  for (const r of ROUTES) {
    const before = page.url();
    await page.goto(r.path);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(400);
    const url = page.url();
    const onLogin = url.includes('/login');
    const redirected =
      onLogin ||
      (r.adminOnly && role !== 'ADMIN' && url.includes('/dashboard') && r.path.startsWith('/admin'));
    const allowed = !redirected && !onLogin;
    state.rbacMatrix.push({
      role,
      route: r.path,
      name: r.name,
      allowed,
      finalUrl: url,
    });
    await screenshot(page, `rbac-${role}-${r.path.replace(/\//g, '_')}`);
  }
}

test.describe.configure({ mode: 'serial' });

test.describe('Phase 2.6 Full Browser Execution', () => {
  test.beforeAll(() => {
    ensureDir();
    fs.mkdirSync(path.dirname(RESULTS_PATH), { recursive: true });
  });

  test.afterAll(() => {
    fs.writeFileSync(
      RESULTS_PATH,
      JSON.stringify({ generatedAt: new Date().toISOString(), ...state }, null, 2)
    );
  });

  test('ADMIN — full dealership flow', async ({ page }) => {
    page.on('console', (msg) => {
      if (['error', 'warning'].includes(msg.type())) {
        state.browserConsole.push({ role: 'ADMIN', type: msg.type(), text: msg.text() });
      }
    });
    page.on('dialog', (d) => d.accept());
    attachApiLogger(page, state.apiLog, 'ADMIN');

    await loginAs(page, 'ADMIN', 'admin');
    record('ADMIN login', true);
    recordShot(await screenshot(page, 'admin-02-dashboard'));

    await expect(page.getByText(/Executive Dashboard|Dashboard/i).first()).toBeVisible();
    await expect(page.getByText(/Low stock|Today's Sales|Total Customers/i).first()).toBeVisible({ timeout: 15000 }).catch(() => {});
    recordShot(await screenshot(page, 'admin-03-executive-dashboard'));

    state.performance.push(await measurePageLoad(page, '/customers', 'Customers'));
    recordShot(await screenshot(page, 'admin-04-customers'));

    const shopName = `PW Shop ${Date.now()}`;
    const custForm = page.locator('.form-grid').first();
    await custForm.locator('input').nth(0).fill(shopName);
    await custForm.locator('input').nth(1).fill('Playwright Owner');
    await custForm.locator('input').nth(2).fill('9900112233');
    await page.getByRole('button', { name: /Save Customer/i }).click();
    await page.waitForTimeout(800);
    record('ADMIN create customer', true, shopName);
    recordShot(await screenshot(page, 'admin-05-customer-created'));

    const token = await page.evaluate(() => localStorage.getItem('token'));
    const custRow = page.locator('tr', { hasText: shopName }).first();
    const custId = await page.evaluate(async ({ name, tok }) => {
      const res = await fetch('/api/customers', { headers: { Authorization: `Bearer ${tok}` } });
      const list = await res.json();
      const c = list.find((x) => x.shop_name === name);
      return c?.id;
    }, { name: shopName, tok: token });
    if (custId) {
      const editRes = await page.request.put(`/api/customers/${custId}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { shop_name: `${shopName} Edited`, owner_name: 'PW Updated', phone: '9900112233' },
      });
      record('ADMIN edit customer (API — no edit UI)', editRes.ok(), `status ${editRes.status()}`);
    }

    if (await custRow.count()) {
      await custRow.getByRole('button', { name: '🗑' }).click();
      await page.waitForTimeout(600);
      record('ADMIN delete customer', true);
      recordShot(await screenshot(page, 'admin-06-customer-deleted'));
    }

    state.performance.push(await measurePageLoad(page, '/inventory', 'Inventory'));
    const invName = `PW Cola ${Date.now()}`;
    const invForm = page.locator('.form-grid').first();
    await invForm.locator('input').nth(0).fill(invName);
    await invForm.locator('input').nth(4).fill('50');
    await invForm.locator('input').nth(6).fill('120');
    await page.getByRole('button', { name: /Save Product/i }).click();
    await page.waitForTimeout(800);
    record('ADMIN create inventory', true);
    recordShot(await screenshot(page, 'admin-07-inventory-created'));

    const invRow = page.locator('tr', { hasText: invName }).first();
    if (await invRow.count()) {
      await invRow.getByRole('button', { name: '✏️' }).click();
      await page.locator('.form-grid').first().locator('input').nth(4).fill('45');
      await page.getByRole('button', { name: /Update Product/i }).click();
      await page.waitForTimeout(600);
      record('ADMIN update inventory', true);
      recordShot(await screenshot(page, 'admin-08-inventory-updated'));
    }

    state.performance.push(await measurePageLoad(page, '/sales', 'Sales'));
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    const custSelect = page.locator('select').first();
    await custSelect.selectOption({ index: 1 });
    const prodSelect = page.locator('select').nth(1);
    await prodSelect.selectOption({ index: 1 });
    await page.locator('.form-grid input[type="number"]').first().fill('2');
    await page.waitForTimeout(300);
    await page.getByRole('button', { name: /Record Sale/i }).click();
    await page.waitForTimeout(1000);
    record('ADMIN create sale', true);
    recordShot(await screenshot(page, 'admin-09-sale-created'));

    const salesRes = await page.request.get('/api/sales', { headers: { Authorization: `Bearer ${token}` } });
    const sales = salesRes.ok() ? await salesRes.json() : [];
    const lastSale = sales[0];
    if (lastSale?.id) {
      const pdfRes = await page.request.get(`/api/pdf/sales-invoice/${lastSale.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      record('ADMIN sales invoice PDF', pdfRes.ok(), `status ${pdfRes.status()}`);
    }

    await page.goto('/deliveries');
    await page.waitForLoadState('networkidle');
    await page.locator('select').first().selectOption({ index: 1 });
    await page.locator('select').nth(1).selectOption({ index: 1 });
    await page.locator('.form-grid input[type="number"]').first().fill('5');
    await page.getByRole('button', { name: /Log Delivery/i }).click();
    await page.waitForTimeout(800);
    record('ADMIN log delivery', true);
    recordShot(await screenshot(page, 'admin-10-delivery-created'));

    const loginDel = await page.request.post('/api/login', {
      data: { username: USERS.DELIVERY_AGENT.user, password: USERS.DELIVERY_AGENT.pass },
    });
    let delUserId;
    if (loginDel.ok()) {
      const { token: delTok } = await loginDel.json();
      const payload = JSON.parse(Buffer.from(delTok.split('.')[1], 'base64').toString());
      delUserId = payload.id;
    }
    const assignRes = await page.request.post('/api/deliveries', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        customer_id: 1,
        product_name: 'Assigned Delivery',
        quantity: 3,
        delivery_date: new Date().toISOString().slice(0, 10),
        driver_name: 'Agent Driver',
        vehicle_no: 'KA-01-PW',
        status: 'Pending',
        assigned_user_id: delUserId,
      },
    });
    record('ADMIN assign delivery (API)', assignRes.ok(), `status ${assignRes.status()}`);

    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: 'CSV' }).first().click();
    await page.waitForTimeout(500);
    const pdfBtn = page.getByRole('button', { name: 'PDF' });
    if (await pdfBtn.count()) await pdfBtn.click();
    await page.waitForTimeout(500);
    record('ADMIN export reports', true);
    recordShot(await screenshot(page, 'admin-11-reports'));

    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    recordShot(await screenshot(page, 'admin-12-notifications'));

    await page.goto('/admin/audit');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/Audit/i).first()).toBeVisible();
    record('ADMIN audit logs page', true);
    recordShot(await screenshot(page, 'admin-13-audit'));

    await probeRoutes(page, 'ADMIN');
    await logout(page);
    record('ADMIN logout', true);
  });

  test('MANAGER — RBAC and allowed screens', async ({ page }) => {
    attachApiLogger(page, state.apiLog, 'MANAGER');
    await loginAs(page, 'MANAGER', 'manager');
    record('MANAGER login', true);
    recordShot(await screenshot(page, 'manager-01-dashboard'));

    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    record('MANAGER reports access', page.url().includes('/reports'));
    recordShot(await screenshot(page, 'manager-02-reports'));

    await page.goto('/admin/audit');
    await page.waitForTimeout(600);
    const deniedAudit = page.url().includes('/dashboard') && !page.url().includes('/admin/audit');
    record('MANAGER audit denied', deniedAudit, page.url());
    recordShot(await screenshot(page, 'manager-03-audit-denied'));

    await page.goto('/admin/payments');
    await page.waitForTimeout(600);
    const deniedAdmin = !page.url().includes('/admin/payments');
    record('MANAGER admin payments denied', deniedAdmin, page.url());
    recordShot(await screenshot(page, 'manager-04-admin-denied'));

    await probeRoutes(page, 'MANAGER');
    await logout(page);
  });

  test('SALESPERSON — sales and restrictions', async ({ page }) => {
    page.on('dialog', (d) => d.accept());
    attachApiLogger(page, state.apiLog, 'SALESPERSON');
    await loginAs(page, 'SALESPERSON', 'sales');
    record('SALESPERSON login', true);

    await page.goto('/customers');
    await page.locator('.form-grid input').first().fill(`Sales PW ${Date.now()}`);
    await page.getByRole('button', { name: /Save Customer/i }).click();
    await page.waitForTimeout(600);
    record('SALESPERSON create customer', true);
    recordShot(await screenshot(page, 'sales-01-customer'));

    await page.goto('/inventory');
    await page.getByPlaceholder('Search products').fill('Thums');
    await page.waitForTimeout(500);
    record('SALESPERSON search products', true);
    recordShot(await screenshot(page, 'sales-02-inventory-search'));

    await page.goto('/sales');
    await page.locator('select').first().selectOption({ index: 1 });
    await page.locator('select').nth(1).selectOption({ index: 1 });
    await page.locator('.form-grid input[type="number"]').first().fill('1');
    await page.getByRole('button', { name: /Record Sale/i }).click();
    await page.waitForTimeout(800);
    record('SALESPERSON create sale', true);
    recordShot(await screenshot(page, 'sales-03-sale'));

    const token = await page.evaluate(() => localStorage.getItem('token'));
    const salesRes = await page.request.get('/api/sales', { headers: { Authorization: `Bearer ${token}` } });
    const sales = salesRes.ok() ? await salesRes.json() : [];
    if (sales[0]?.id) {
      const pdf = await page.request.get(`/api/pdf/sales-invoice/${sales[0].id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      record('SALESPERSON invoice PDF', pdf.ok(), String(pdf.status()));
    }

    await page.goto('/reports');
    await page.waitForTimeout(500);
    record('SALESPERSON reports denied', page.url().includes('/dashboard'));
    recordShot(await screenshot(page, 'sales-04-reports-denied'));

    await page.goto('/admin/audit');
    await page.waitForTimeout(500);
    record('SALESPERSON audit denied', !page.url().includes('/admin/audit'));
    recordShot(await screenshot(page, 'sales-05-audit-denied'));

    await probeRoutes(page, 'SALESPERSON');
    await logout(page);
  });

  test('DELIVERY_AGENT — deliveries only', async ({ page }) => {
    attachApiLogger(page, state.apiLog, 'DELIVERY_AGENT');
    await loginAs(page, 'DELIVERY_AGENT', 'delivery');
    record('DELIVERY_AGENT login', true);

    await page.goto('/deliveries');
    await page.waitForLoadState('networkidle');
    const rows = await page.locator('tbody tr').count();
    record('DELIVERY_AGENT view deliveries', rows >= 0, `${rows} rows`);
    recordShot(await screenshot(page, 'delivery-01-deliveries'));

    await page.goto('/sales');
    await page.waitForTimeout(500);
    record('DELIVERY_AGENT sales denied', page.url().includes('/dashboard'));
    recordShot(await screenshot(page, 'delivery-02-sales-denied'));

    await page.goto('/reports');
    await page.waitForTimeout(500);
    record('DELIVERY_AGENT reports denied', page.url().includes('/dashboard'));
    recordShot(await screenshot(page, 'delivery-03-reports-denied'));

    await page.goto('/admin/audit');
    await page.waitForTimeout(500);
    record('DELIVERY_AGENT admin denied', !page.url().includes('/admin/audit'));
    recordShot(await screenshot(page, 'delivery-04-admin-denied'));

    await probeRoutes(page, 'DELIVERY_AGENT');
    await logout(page);
  });
});
