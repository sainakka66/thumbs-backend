// @ts-check
const fs = require('fs');
const path = require('path');

const SCREENSHOTS = path.join(__dirname, '..', '..', 'screenshots');
const USERS = {
  ADMIN: { user: process.env.TEST_ADMIN_USER || 'admin_test', pass: process.env.TEST_ADMIN_PASS || 'TestAdmin!2026' },
  MANAGER: { user: process.env.TEST_MANAGER_USER || 'manager_test', pass: process.env.TEST_MANAGER_PASS || 'TestManager!2026' },
  SALESPERSON: { user: process.env.TEST_SALES_USER || 'sales_test', pass: process.env.TEST_SALES_PASS || 'TestSales!2026' },
  DELIVERY_AGENT: { user: process.env.TEST_DELIVERY_USER || 'delivery_test', pass: process.env.TEST_DELIVERY_PASS || 'TestDelivery!2026' },
};

const ROUTES = [
  { path: '/dashboard', name: 'Dashboard', perms: ['dashboard.view'] },
  { path: '/customers', name: 'Customers', perms: ['customers.view'] },
  { path: '/inventory', name: 'Inventory', perms: ['inventory.view'] },
  { path: '/sales', name: 'Sales', perms: ['sales.view'] },
  { path: '/deliveries', name: 'Deliveries', perms: ['deliveries.view', 'deliveries.view_own'] },
  { path: '/reports', name: 'Reports', perms: ['reports.view'] },
  { path: '/notifications', name: 'Notifications', perms: ['notifications.view'] },
  { path: '/admin/audit', name: 'Audit Logs', perms: ['audit.view'], adminOnly: true },
  { path: '/admin/payments', name: 'Admin Payments', adminOnly: true },
  { path: '/payments', name: 'UPI Payments', perms: ['payments.view'] },
];

function ensureDir() {
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
}

async function screenshot(page, name) {
  ensureDir();
  const file = path.join(SCREENSHOTS, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function loginAs(page, role, prefix) {
  const cred = USERS[role];
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await screenshot(page, `${prefix}-login-page`);
  await page.getByPlaceholder('Your username').fill(cred.user);
  await page.getByPlaceholder('Enter your password').fill(cred.pass);
  await page.getByRole('button', { name: 'Sign In →' }).click();
  await page.waitForURL(/dashboard/, { timeout: 30000 });
  await screenshot(page, `${prefix}-dashboard-after-login`);
}

async function measurePageLoad(page, path, label) {
  const start = Date.now();
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.locator('h1').first().waitFor({ timeout: 20000 });
  const ms = Date.now() - start;
  return { page: label, path, loadMs: ms };
}

function attachApiLogger(page, apiLog, pageLabel) {
  page.on('response', async (response) => {
    const url = response.url();
    let pathname = url;
    try {
      pathname = new URL(url).pathname;
    } catch {
      /* relative */
    }
    const apiHit =
      url.includes('/api/') ||
      /\/(customers|sales|inventory|deliveries|dashboard|login|logout|products|reports|notifications|audit|search|stock|pdf|payments|business)/.test(
        pathname
      );
    if (!apiHit) return;
    let body = null;
    try {
      const ct = response.headers()['content-type'] || '';
      if (ct.includes('json')) {
        body = await response.json().catch(() => null);
      }
    } catch {
      body = null;
    }
    const req = response.request();
    let postData = null;
    try {
      postData = req.postDataJSON?.() || req.postData() || null;
    } catch {
      postData = null;
    }
    apiLog.push({
      page: pageLabel,
      method: req.method(),
      url,
      status: response.status(),
      durationMs: Math.round(response.request().timing()?.responseEnd || 0) || null,
      request: postData,
      responsePreview: body && typeof body === 'object' ? JSON.stringify(body).slice(0, 200) : null,
      timestamp: new Date().toISOString(),
    });
  });
}

async function visitRoute(page, routePath, shotPrefix) {
  await page.goto(routePath);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
  const url = page.url();
  const denied = url.includes('/login') || (routePath !== '/dashboard' && url.endsWith('/dashboard') && routePath.startsWith('/admin'));
  await screenshot(page, shotPrefix);
  return { path: routePath, finalUrl: url, denied };
}

module.exports = {
  SCREENSHOTS,
  USERS,
  ROUTES,
  screenshot,
  loginAs,
  measurePageLoad,
  attachApiLogger,
  visitRoute,
  ensureDir,
};
