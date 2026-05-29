/**
 * Build Phase 2.6 markdown reports from browser-execution.json + DB audit proof.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { getDbConfig } = require('../config');
const { writeMarkdown, table, statusIcon, pct } = require('../verification/lib/report');
const { ROOT, RESULTS_DIR } = require('../verification/lib/config');

const EXEC_JSON = path.join(RESULTS_DIR, 'browser-execution.json');
const PW_JSON = path.join(RESULTS_DIR, 'ui-playwright.json');

function loadJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function groupApiByPage(apiLog) {
  const map = {};
  for (const e of apiLog || []) {
    const key = e.page || 'unknown';
    if (!map[key]) map[key] = [];
    map[key].push(e);
  }
  return map;
}

async function fetchAuditProof() {
  const config = getDbConfig();
  if (!config) return { error: 'DB not configured', rows: [] };
  const conn = await mysql.createConnection(config);
  try {
    const [rows] = await conn.query(
      `SELECT id, username, action, entity_type, entity_id, created_at
       FROM audit_logs ORDER BY id DESC LIMIT 25`
    );
    const [counts] = await conn.query(
      `SELECT action, COUNT(*) AS c FROM audit_logs GROUP BY action ORDER BY c DESC LIMIT 15`
    );
    return { rows, counts };
  } catch (e) {
    return { error: e.message, rows: [] };
  } finally {
    await conn.end();
  }
}

async function main() {
  const exec = loadJson(EXEC_JSON) || {};
  const pw = loadJson(PW_JSON) || {};
  const audit = await fetchAuditProof();

  const apiLines = [
    '# API Flow Report (Browser Execution)',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Captured from Playwright network listeners during headed browser runs.',
    '',
  ];
  const grouped = groupApiByPage(exec.apiLog);
  for (const [page, calls] of Object.entries(grouped)) {
    apiLines.push(`## ${page}`, '');
    apiLines.push(
      table(
        ['Method', 'URL', 'Status', 'Request', 'Response preview'],
        calls.slice(0, 40).map((c) => [
          c.method,
          c.url.replace(/^https?:\/\/[^/]+/, ''),
          String(c.status),
          c.request ? JSON.stringify(c.request).slice(0, 80) : '—',
          c.responsePreview || '—',
        ])
      )
    );
    apiLines.push('');
  }
  writeMarkdown('API_FLOW_REPORT.md', apiLines);

  const rbacLines = [
    '# RBAC Execution Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Route probes performed by direct navigation after login per role.',
    '',
    table(
      ['Role', 'Route', 'Screen', 'Result', 'Final URL'],
      (exec.rbacMatrix || []).map((r) => [
        r.role,
        r.route,
        r.name,
        r.allowed ? 'Allowed' : 'Denied',
        r.finalUrl?.replace(/^https?:\/\/[^/]+/, '') || '—',
      ])
    ),
    '',
    '## Expected matrix (reference)',
    '',
    '| Route | ADMIN | MANAGER | SALESPERSON | DELIVERY_AGENT |',
    '| --- | --- | --- | --- | --- |',
    '| /dashboard | Allowed | Allowed | Allowed | Allowed |',
    '| /customers | Allowed | Allowed | Allowed | Denied* |',
    '| /inventory | Allowed | Allowed | Allowed | Denied |',
    '| /sales | Allowed | Allowed | Allowed | Denied |',
    '| /deliveries | Allowed | Allowed | Denied** | Own only |',
    '| /reports | Allowed | Allowed | Denied | Denied |',
    '| /admin/audit | Allowed | Denied | Denied | Denied |',
    '',
    '*Delivery agent has no customers.view permission.',
    '**Salesperson lacks deliveries.view.',
  ];
  writeMarkdown('RBAC_EXECUTION_REPORT.md', rbacLines);

  const auditLines = [
    '# Audit Proof Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Recent audit_logs rows (database)',
    '',
  ];
  if (audit.error) {
    auditLines.push(`Database error: ${audit.error}`);
  } else {
    auditLines.push(
      table(
        ['ID', 'User', 'Action', 'Entity', 'Entity ID', 'Created'],
        audit.rows.map((r) => [
          String(r.id),
          r.username || '—',
          r.action,
          r.entity_type,
          r.entity_id || '—',
          String(r.created_at),
        ])
      )
    );
    auditLines.push('', '## Action counts', '');
    auditLines.push(
      table(
        ['Action', 'Count'],
        (audit.counts || []).map((c) => [c.action, String(c.c)])
      )
    );
  }
  auditLines.push('', '## Browser-verified actions', '');
  for (const t of exec.tests || []) {
    if (/customer|sale|inventory|login|logout|delivery|audit/i.test(t.name)) {
      auditLines.push(`- ${statusIcon(t.pass)} **${t.name}** — ${t.detail || 'executed in browser'}`);
    }
  }
  writeMarkdown('AUDIT_PROOF_REPORT.md', auditLines);

  const perfLines = [
    '# Performance Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    'Measured as time from navigation until first `h1` visible (Playwright).',
    '',
    table(
      ['Page', 'Path', 'Load (ms)'],
      (exec.performance || []).map((p) => [p.page, p.path, String(p.loadMs)])
    ),
  ];
  writeMarkdown('PERFORMANCE_REPORT.md', perfLines);

  const passed = (exec.tests || []).filter((t) => t.pass).length;
  const total = (exec.tests || []).length;
  const failed = (exec.tests || []).filter((t) => !t.pass);

  const finalLines = [
    '# Final System Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    '## Execution summary',
    '',
    `- Playwright UI tests: ${pw.stats ? `${pw.stats.passed}/${pw.stats.total} passed` : 'see verification/results/ui-playwright.json'}`,
    `- Browser flow checks: ${passed}/${total} (${pct(passed, total)})`,
    `- Screenshots: ${(exec.screenshots || []).length} files under \`verification/screenshots/\``,
    `- API calls logged: ${(exec.apiLog || []).length}`,
    '',
    '## 1. Working features',
    '',
    ...(exec.tests || []).filter((t) => t.pass).map((t) => `- ${t.name}`),
    '',
    '## 2. Broken / failed checks',
    '',
    ...(failed.length ? failed.map((t) => `- ${t.name}: ${t.detail}`) : ['- None recorded in browser flow']),
    '',
    '## 3. Missing APIs',
    '',
    '- `PUT /deliveries/:id` — delivery status update permission exists but no route',
    '- `users.manage` — no user management API',
    '',
    '## 4. Missing UI screens',
    '',
    '- Suppliers (use distributors table only; no UI)',
    '- Customer edit form (update via API only)',
    '- Sales invoice PDF button on Sales page (PDF via API only)',
    '- Delivery assignment UI (`assigned_user_id` API-only)',
    '- Inline delivery status update for agents',
    '',
    '## 5. Security concerns',
    '',
    '- Confirm production `JWT_SECRET` and HTTPS-only cookies',
    '- Rate limiting on `/login` should remain enabled',
    '',
    '## 6. RBAC issues',
    '',
    ...(exec.rbacMatrix || [])
      .filter((r) => {
        if (r.role === 'ADMIN') return false;
        if (r.route === '/reports' && r.role === 'MANAGER') return !r.allowed;
        if (r.route.startsWith('/admin') && r.role !== 'ADMIN') return r.allowed;
        return false;
      })
      .map((r) => `- Unexpected allow: ${r.role} → ${r.route}`)
      .concat(['- See RBAC_EXECUTION_REPORT.md for full matrix']) || ['- See RBAC_EXECUTION_REPORT.md'],
    '',
    '## 7. Audit issues',
    '',
    audit.error ? `- ${audit.error}` : `- ${audit.rows.length} recent rows sampled; login/sale/customer actions should append new rows`,
    '',
    '## 8. Database issues',
    '',
    audit.error ? `- ${audit.error}` : '- Connection OK for audit sample query',
    '',
    '## 9. Performance issues',
    '',
    ...(exec.performance || [])
      .filter((p) => p.loadMs > 3000)
      .map((p) => `- Slow: ${p.page} ${p.loadMs}ms`)
      .concat(
        (exec.performance || []).every((p) => p.loadMs <= 3000)
          ? ['- No page exceeded 3s threshold in this run']
          : []
      ),
    '',
    '## 10. Production readiness score',
    '',
    `**${Math.round((passed / Math.max(total, 1)) * 0.7 * 100 + (audit.rows?.length ? 15 : 0) + (exec.apiLog?.length ? 15 : 0))}/100** (browser-weighted estimate)`,
    '',
    '## Proof artifacts',
    '',
    '- `verification/results/browser-execution.json`',
    '- `verification/screenshots/*.png`',
    '- `API_FLOW_REPORT.md`, `RBAC_EXECUTION_REPORT.md`, `AUDIT_PROOF_REPORT.md`, `PERFORMANCE_REPORT.md`',
  ];
  writeMarkdown('FINAL_SYSTEM_REPORT.md', finalLines);

  console.log('\n✓ Reports written: API_FLOW_REPORT.md, RBAC_EXECUTION_REPORT.md, AUDIT_PROOF_REPORT.md, PERFORMANCE_REPORT.md, FINAL_SYSTEM_REPORT.md\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
