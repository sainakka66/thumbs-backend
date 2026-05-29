/**
 * Security verification — unit guards + HTTP bypass probes.
 * Usage: npm run verify:security
 */
require('dotenv').config();
const { spawnSync } = require('child_process');
const path = require('path');
const { request, healthCheck } = require('../verification/lib/http');
const { writeJson, writeMarkdown, statusIcon, pct, table } = require('../verification/lib/report');
const { API_BASE } = require('../verification/lib/config');
const {
  assertNoSqlInjection,
  parseStrictPositiveInt,
} = require('../lib/security/inputGuard');

const results = [];

function record(name, pass, detail) {
  results.push({ name, pass, detail });
}

async function httpProbes() {
  const up = await healthCheck();
  if (!up) {
    record('API reachable', false, API_BASE);
    return;
  }
  record('API reachable', true, API_BASE);

  const noAuth = await request('GET', '/customers');
  record('JWT required on /customers', noAuth.status === 403 || noAuth.status === 401, `status ${noAuth.status}`);

  const badToken = await request('GET', '/customers', { token: 'invalid.jwt.token' });
  record('Invalid JWT rejected', badToken.status === 401, `status ${badToken.status}`);

  const sqli = await request('GET', "/products/search/' OR 1=1--", { token: 'x' });
  record('SQL injection path blocked or auth first', sqli.status !== 200 || sqli.status === 403, `status ${sqli.status}`);
}

function unitGuards() {
  try {
    assertNoSqlInjection('normal text');
    record('inputGuard allows safe text', true, 'ok');
  } catch {
    record('inputGuard allows safe text', false, 'unexpected reject');
  }

  try {
    assertNoSqlInjection("1' UNION SELECT");
    record('inputGuard blocks UNION', false, 'should throw');
  } catch {
    record('inputGuard blocks UNION', true, 'rejected');
  }

  try {
    parseStrictPositiveInt('42');
    record('parseStrictPositiveInt valid', true, '42');
  } catch {
    record('parseStrictPositiveInt valid', false, 'failed');
  }

  try {
    parseStrictPositiveInt('1 OR 1=1');
    record('parseStrictPositiveInt injection', false, 'should throw');
  } catch {
    record('parseStrictPositiveInt injection', true, 'rejected');
  }
}

function runPaymentSecurityTests() {
  const r = spawnSync(process.execPath, ['--test', 'security/payment-security.test.mjs'], {
    cwd: path.join(__dirname, '..'),
    encoding: 'utf8',
  });
  record('payment-security.test.mjs', r.status === 0, r.status === 0 ? 'all tests pass' : r.stderr?.slice(0, 200) || 'failed');
}

async function main() {
  unitGuards();
  runPaymentSecurityTests();
  await httpProbes();

  const pass = results.filter((r) => r.pass).length;
  const total = results.length;
  writeJson('security', { pass, total, results });

  writeMarkdown('SECURITY_REPORT.md', [
    '# Security Report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `**Overall:** ${statusIcon(pass === total)} ${pass}/${total} (${pct(pass, total)})`,
    '',
    table(
      ['Check', 'Result', 'Detail'],
      results.map((r) => [r.name, r.pass ? 'PASS' : 'FAIL', r.detail])
    ),
    '',
  ]);

  console.log(`\n✓ verify:security — ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
