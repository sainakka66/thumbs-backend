// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const SCREENSHOTS = path.join(__dirname, '..', '..', 'screenshots');

const USERS = {
  admin: { user: 'admin_test', pass: 'TestAdmin!2026' },
};

async function login(page, username, password) {
  await page.goto('/login');
  await page.getByPlaceholder('Your username').fill(username);
  await page.getByPlaceholder('Enter your password').fill(password);
  await page.getByRole('button', { name: 'Sign In →' }).click();
  await page.waitForURL(/dashboard/, { timeout: 20000 });
}

test.describe('ThumbsUp UI verification', () => {
  test.beforeAll(() => {
    fs.mkdirSync(SCREENSHOTS, { recursive: true });
  });

  test('login flow', async ({ page }) => {
    await login(page, USERS.admin.user, USERS.admin.pass);
    await page.screenshot({ path: path.join(SCREENSHOTS, '01-login-dashboard.png'), fullPage: true });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('dashboard page', async ({ page }) => {
    await login(page, USERS.admin.user, USERS.admin.pass);
    await page.goto('/dashboard');
    await expect(page.locator('h1, .font-head')).toContainText(/Dashboard/i);
    await page.screenshot({ path: path.join(SCREENSHOTS, '02-dashboard.png'), fullPage: true });
  });

  test('customers page', async ({ page }) => {
    await login(page, USERS.admin.user, USERS.admin.pass);
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOTS, '03-customers.png'), fullPage: true });
  });

  test('inventory page', async ({ page }) => {
    await login(page, USERS.admin.user, USERS.admin.pass);
    await page.goto('/inventory');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOTS, '04-inventory.png'), fullPage: true });
  });

  test('sales page', async ({ page }) => {
    await login(page, USERS.admin.user, USERS.admin.pass);
    await page.goto('/sales');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOTS, '05-sales.png'), fullPage: true });
  });

  test('deliveries page', async ({ page }) => {
    await login(page, USERS.admin.user, USERS.admin.pass);
    await page.goto('/deliveries');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOTS, '06-deliveries.png'), fullPage: true });
  });

  test('reports page', async ({ page }) => {
    await login(page, USERS.admin.user, USERS.admin.pass);
    await page.goto('/reports');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOTS, '07-reports.png'), fullPage: true });
  });

  test('notifications page', async ({ page }) => {
    await login(page, USERS.admin.user, USERS.admin.pass);
    await page.goto('/notifications');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(SCREENSHOTS, '08-notifications.png'), fullPage: true });
  });
});
