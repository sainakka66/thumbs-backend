/**
 * Master verification orchestrator.
 * Usage: npm run verify:all
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { writeJson, writeMarkdown, statusIcon, pct, table } = require('../verification/lib/report');
const { RESULTS_DIR, ROOT } = require('../verification/lib/config');

const STEPS = [
  { name: 'db', script: 'verify-db.js', report: 'DB_HEALTH_REPORT.md', key: 'db' },
  { name: 'api', script: 'verify-api.js', report: 'API_VERIFICATION_REPORT.md', key: 'api' },
  { name: 'security', script: 'verify-security.js', report: 'SECURITY_REPORT.md', key: 'security' },
  { name: 'rbac', script: 'verify-rbac.js', report: 'RBAC_TEST_REPORT.md', key: 'rbac' },
  { name: 'audit', script: 'verify-audit.js', report: 'AUDIT_VERIFICATION_REPORT.md', key: 'audit' },
  { name: 'e2e', script: 'verify-e2e.js', report: 'E2E_FLOW_REPORT.md', key: 'e2e' },
  { name: 'ui', script: 'verify-ui.js', report: 'UI_VERIFICATION_REPORT.md', key: 'ui', optional: true },
];

function runScript(script) {
  const scriptPath = path.join(__dirname, script);
  const r = spawnSync(process.execPath, [scriptPath], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
  });
  return { exitCode: r.status, stdout: r.stdout, stderr: r.stderr };
}

function loadResult(key) {
  try {
    const p = path.join(RESULTS_DIR, `${key}.json`);
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function generateDashboard(suites) {
  const htmlPath = path.join(ROOT, 'verification', 'index.html');
  const data = {
    generatedAt: new Date().toISOString(),
    suites,
  };
  fs.writeFileSync(path.join(RESULTS_DIR, 'dashboard.json'), JSON.stringify(data, null, 2));

  const cards = suites
    .map(
      (s) => `
    <div class="card ${s.pass === s.total && s.total > 0 ? 'pass' : s.skipped ? 'skip' : 'fail'}">
      <h3>${s.name}</h3>
      <div class="stat">${s.pass}/${s.total}</div>
      <div class="pct">${s.coverage}</div>
      <p class="report">${s.report || ''}</p>
    </div>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>ThumbsUp System Health</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: #0f1419; color: #e7e9ea; margin: 0; padding: 2rem; }
    h1 { margin: 0 0 0.5rem; }
    .sub { color: #71767b; margin-bottom: 2rem; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
    .card { border-radius: 12px; padding: 1.25rem; border: 1px solid #333; }
    .card.pass { background: #0d2818; border-color: #00ba7c; }
    .card.fail { background: #2a0f0f; border-color: #f4212e; }
    .card.skip { background: #1a1a0d; border-color: #ffd400; }
    .stat { font-size: 2rem; font-weight: 700; }
    .pct { color: #71767b; font-size: 0.9rem; }
    .report { font-size: 0.75rem; color: #71767b; margin-top: 0.5rem; }
    .overall { font-size: 1.25rem; margin: 1.5rem 0; padding: 1rem; border-radius: 8px; }
    .overall.ok { background: #0d2818; }
    .overall.bad { background: #2a0f0f; }
  </style>
</head>
<body>
  <h1>ThumbsUp Verification Dashboard</h1>
  <p class="sub">Generated <span id="ts"></span> — open after <code>npm run verify:all</code></p>
  <div id="overall" class="overall"></div>
  <div class="grid">${cards}</div>
  <script>
    const data = ${JSON.stringify(data)};
    document.getElementById('ts').textContent = data.generatedAt;
    const totalPass = data.suites.reduce((a,s)=>a+s.pass,0);
    const totalAll = data.suites.reduce((a,s)=>a+s.total,0);
    const el = document.getElementById('overall');
    el.className = 'overall ' + (totalPass === totalAll ? 'ok' : 'bad');
    el.textContent = totalPass === totalAll
      ? '✅ All suites passed (' + totalPass + '/' + totalAll + ')'
      : '❌ Issues detected (' + totalPass + '/' + totalAll + ')';
  </script>
</body>
</html>`;
  fs.writeFileSync(htmlPath, html);
}

async function main() {
  console.log('\n========================================');
  console.log('  ThumbsUp — Full System Verification');
  console.log('========================================\n');

  fs.mkdirSync(RESULTS_DIR, { recursive: true });

  const suites = [];
  let allPass = true;

  for (const step of STEPS) {
    console.log(`\n--- Running ${step.name} ---\n`);
    const r = runScript(step.script);
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);

    const result = loadResult(step.key);
    const pass = result?.pass ?? 0;
    const total = result?.total ?? 0;
    const ok = r.exitCode === 0;

    if (!ok && !step.optional) allPass = false;
    if (!ok && step.optional) {
      suites.push({
        name: step.name.toUpperCase(),
        pass: 0,
        total: 0,
        coverage: 'SKIPPED',
        report: step.report,
        skipped: true,
      });
    } else {
      suites.push({
        name: step.name.toUpperCase(),
        pass,
        total,
        coverage: result?.coverage || pct(pass, total),
        report: step.report,
        exitCode: r.exitCode,
      });
    }
  }

  const totalPass = suites.reduce((a, s) => a + s.pass, 0);
  const totalAll = suites.reduce((a, s) => a + s.total, 0);

  writeJson('system', { suites, totalPass, totalAll, allPass });
  generateDashboard(suites);

  writeMarkdown('SYSTEM_HEALTH_REPORT.md', [
    '# System Health Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `**Overall:** ${statusIcon(allPass)} ${totalPass}/${totalAll} checks across all suites`,
    '',
    table(
      ['Suite', 'Pass', 'Total', 'Coverage', 'Report', 'Exit'],
      suites.map((s) => [
        s.name,
        String(s.pass),
        String(s.total),
        s.coverage,
        s.report || '—',
        s.skipped ? 'SKIP' : s.exitCode === 0 ? '0' : '1',
      ])
    ),
    '',
    '## Commands',
    '',
    '```bash',
    'npm run seed:test-users   # once, before API/RBAC/E2E/Audit',
    'npm start               # required for API, RBAC, audit, e2e, ui',
    'npm run verify:all',
    '```',
    '',
    'Dashboard: open `verification/index.html` in a browser.',
    '',
  ]);

  console.log('\n========================================');
  console.log(allPass ? '  ✅ SYSTEM HEALTH: PASS' : '  ❌ SYSTEM HEALTH: ISSUES');
  console.log(`  ${totalPass}/${totalAll} checks`);
  console.log('  → SYSTEM_HEALTH_REPORT.md');
  console.log('  → verification/index.html');
  console.log('========================================\n');

  process.exit(allPass ? 0 : 1);
}

main();
