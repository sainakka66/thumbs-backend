/**
 * API endpoint verification against running server.
 * Usage: npm run verify:api  (server must be running)
 */
require('dotenv').config();
const catalog = require('../verification/api-catalog');
const { request, login, healthCheck } = require('../verification/lib/http');
const { writeJson, writeMarkdown, statusIcon, pct, table } = require('../verification/lib/report');
const { TEST_USERS, API_BASE } = require('../verification/lib/config');

function roleHasPermission(role, perm) {
  if (!perm || perm === 'admin') return role === 'ADMIN';
  const loginRes = role; // permissions from login stored separately
  return true; // checked via actual HTTP status
}

function expectedAllowed(role, entry, permissions) {
  if (entry.permission === 'admin') return role === 'ADMIN';
  if (!entry.permission) return true;
  if (role === 'ADMIN') return true;
  const needed = Array.isArray(entry.permission) ? entry.permission : [entry.permission];
  return needed.some((p) => permissions.includes(p));
}

async function main() {
  const results = [];
  const apiUp = await healthCheck();

  if (!apiUp) {
    const summary = {
      pass: 0,
      total: catalog.length,
      skipped: catalog.length,
      apiReachable: false,
      message: `API not reachable at ${API_BASE}. Start server: npm start`,
      results: [],
    };
    writeJson('api', summary);
    writeMarkdown('API_VERIFICATION_REPORT.md', [
      '# API Verification Report',
      '',
      `**API reachable:** ❌ NO (${API_BASE})`,
      '',
      'Start the backend with `npm start` then re-run `npm run verify:api`.',
      '',
    ]);
    console.error('\n✗ verify:api — API unreachable');
    process.exit(1);
  }

  const tokens = {};
  for (const [key, cred] of Object.entries(TEST_USERS)) {
    const lr = await login(cred.username, cred.password);
    tokens[key] = lr;
  }

  const adminToken = tokens.ADMIN?.token;
  const adminPerms = tokens.ADMIN?.permissions || [];

  for (const entry of catalog) {
    let token = null;
    let testRole = 'ADMIN';
    let perms = adminPerms;

    if (entry.auth === 'jwt') {
      if (entry.roles?.includes('ADMIN')) {
        token = adminToken;
        testRole = 'ADMIN';
        perms = tokens.ADMIN?.permissions || [];
      } else {
        token = adminToken;
        testRole = 'ADMIN';
        perms = tokens.ADMIN?.permissions || [];
      }
    }

    let path = entry.path;
    let body = entry.body;
    if (entry.id === 'login') {
      body = { username: TEST_USERS.ADMIN.username, password: TEST_USERS.ADMIN.password };
    }

    const res = await request(entry.method, path, { token, body });
    let pass = false;
    let note = '';

    if (entry.auth === 'none' && entry.id === 'health') {
      pass = res.status === 200 && res.data?.ok;
      note = 'public health';
    } else if (entry.auth === 'none' && entry.id === 'login') {
      pass = res.ok && res.data?.token;
      note = 'login returns token';
    } else if (entry.auth === 'jwt' && !token) {
      pass = false;
      note = 'no token';
    } else if (entry.auth === 'jwt') {
      const allowed = expectedAllowed(testRole, entry, perms);
      pass = allowed ? res.status < 400 : res.status === 403;
      if (!allowed && res.status === 403) pass = true;
      if (allowed && res.status < 400) pass = true;
      note = allowed ? `expect success got ${res.status}` : `expect 403 got ${res.status}`;
    }

    results.push({
      id: entry.id,
      feature: entry.feature,
      method: entry.method,
      path: entry.path,
      auth: entry.auth,
      permission: entry.permission,
      status: res.status,
      elapsedMs: res.elapsed,
      pass,
      note,
    });
  }

  // No-auth probe
  const noAuth = await request('GET', '/customers');
  results.push({
    id: 'auth-required-customers',
    feature: 'JWT required',
    method: 'GET',
    path: '/customers',
    auth: 'none',
    permission: null,
    status: noAuth.status,
    elapsedMs: noAuth.elapsed,
    pass: noAuth.status === 403 || noAuth.status === 401,
    note: 'unauthenticated blocked',
  });

  const pass = results.filter((r) => r.pass).length;
  const total = results.length;
  const summary = { pass, total, coverage: pct(pass, total), apiReachable: true, results };

  writeJson('api', summary);

  writeMarkdown('API_VERIFICATION_REPORT.md', [
    '# API Verification Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    `API base: ${API_BASE}`,
    '',
    `**Overall:** ${statusIcon(pass === total)} ${pass}/${total} (${pct(pass, total)})`,
    '',
    table(
      ['Feature', 'Method', 'Path', 'Auth', 'Permission', 'Status', 'ms', 'Result', 'Note'],
      results.map((r) => [
        r.feature,
        r.method,
        r.path,
        r.auth || '—',
        r.permission ? (Array.isArray(r.permission) ? r.permission.join('|') : r.permission) : '—',
        String(r.status),
        String(r.elapsedMs),
        r.pass ? 'PASS' : 'FAIL',
        r.note,
      ])
    ),
    '',
  ]);

  console.log(`\n✓ verify:api — ${pass}/${total} (${pct(pass, total)})`);
  process.exit(pass === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
