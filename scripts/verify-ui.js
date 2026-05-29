/**
 * Playwright UI verification wrapper.
 * Usage: npm run verify:ui
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { writeJson, writeMarkdown, statusIcon, pct, table } = require('../verification/lib/report');
const { ROOT, SCREENSHOTS_DIR, API_BASE } = require('../verification/lib/config');

function main() {
  const pwDir = path.join(ROOT, 'verification', 'playwright');
  const config = path.join(pwDir, 'playwright.config.js');

  if (!fs.existsSync(config)) {
    writeJson('ui', { pass: 0, total: 0, skipped: true, message: 'Playwright config missing' });
    writeMarkdown('UI_VERIFICATION_REPORT.md', '# UI Verification\n\nPlaywright not configured.\n');
    process.exit(0);
  }

  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const install = spawnSync('npx', ['playwright', 'install', 'chromium'], {
    cwd: ROOT,
    shell: true,
    encoding: 'utf8',
  });

  const r = spawnSync(
    'npx',
    ['playwright', 'test', '--config', config],
    {
      cwd: ROOT,
      shell: true,
      encoding: 'utf8',
      env: { ...process.env, VERIFY_API_BASE_URL: API_BASE, UI_BASE_URL: process.env.UI_BASE_URL || 'http://127.0.0.1:5173' },
    }
  );

  if (r.stdout) process.stdout.write(r.stdout);
  if (r.stderr) process.stderr.write(r.stderr);

  let results = { pass: 0, total: 0, tests: [] };
  try {
    const reportPath = path.join(ROOT, 'verification', 'results', 'ui-playwright.json');
    if (fs.existsSync(reportPath)) {
      results = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    }
  } catch {
    const pass = r.status === 0 ? 1 : 0;
    results = { pass, total: 1, tests: [{ name: 'playwright suite', pass: r.status === 0 }] };
  }

  writeJson('ui', results);

  writeMarkdown('UI_VERIFICATION_REPORT.md', [
    '# UI Verification Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `**Overall:** ${statusIcon(results.pass === results.total && results.total > 0)} ${results.pass}/${results.total}`,
    '',
    'Screenshots: `verification/screenshots/`',
    '',
    results.tests?.length
      ? table(
          ['Test', 'Result'],
          results.tests.map((t) => [t.name, t.pass ? 'PASS' : 'FAIL'])
        )
      : `_Playwright exit code: ${r.status}_`,
    '',
  ]);

  console.log(`\n✓ verify:ui — exit ${r.status}`);
  process.exit(r.status === 0 ? 0 : 1);
}

main();
