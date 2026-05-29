// @ts-check
const path = require('path');

module.exports = {
  testDir: path.join(__dirname, 'tests'),
  timeout: 120000,
  retries: 0,
  workers: 1,
  use: {
    baseURL: process.env.UI_BASE_URL || 'http://localhost:5173',
    headless: process.env.PLAYWRIGHT_HEADLESS === '1',
    channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome',
    screenshot: 'on',
    trace: 'retain-on-failure',
    video: 'off',
    launchOptions: {
      slowMo: process.env.PLAYWRIGHT_SLOW_MO ? Number(process.env.PLAYWRIGHT_SLOW_MO) : 0,
    },
  },
  reporter: [
    ['list'],
    [path.join(__dirname, 'lib', 'playwright-json-reporter.js'), { outputFile: 'verification/results/ui-playwright.json' }],
  ],
  outputDir: path.join(__dirname, '..', 'screenshots', 'test-results'),
};
