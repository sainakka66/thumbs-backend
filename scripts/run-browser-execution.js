/**
 * Phase 2.6 — Start stack, seed data, run headed Playwright, generate reports.
 * Usage: npm run verify:browser
 */
require('dotenv').config();
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend');
const API_URL = process.env.VERIFY_API_BASE_URL || 'http://127.0.0.1:3000';
const UI_URL = process.env.UI_BASE_URL || 'http://localhost:5173';
const UI_FALLBACK = UI_URL.includes('localhost') ? 'http://127.0.0.1:5173' : 'http://localhost:5173';

const children = [];

function runNode(script, label) {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(process.execPath, [path.join(__dirname, script)], {
    cwd: ROOT,
    encoding: 'utf8',
    env: process.env,
    stdio: 'inherit',
  });
  if (r.status !== 0) {
    throw new Error(`${label} failed (exit ${r.status})`);
  }
}

function probeUrl(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 4000 }, (res) => {
      res.resume();
      resolve(res.statusCode != null && res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServers(apiUrl, uiUrls, timeoutMs = 120000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const apiOk = await probeUrl(`${apiUrl}/health`);
    let uiOk = false;
    for (const u of uiUrls) {
      if (await probeUrl(u)) {
        uiOk = true;
        break;
      }
    }
    if (apiOk && uiOk) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timeout waiting for API ${apiUrl}/health and UI ${uiUrls.join(' or ')}`);
}

function startProcess(cmd, args, cwd, name, extraEnv = {}) {
  const child = spawn(cmd, args, {
    cwd,
    env: { ...process.env, FORCE_COLOR: '1', ...extraEnv },
    shell: process.platform === 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => process.stdout.write(`[${name}] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[${name}] ${d}`));
  children.push(child);
  return child;
}

function shutdown() {
  for (const c of children) {
    try {
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/pid', String(c.pid), '/f', '/t'], { stdio: 'ignore' });
      } else {
        c.kill('SIGTERM');
      }
    } catch {
      /* ignore */
    }
  }
}

async function main() {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║  Phase 2.6 — Full Browser Execution              ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  fs.mkdirSync(path.join(ROOT, 'verification', 'screenshots'), { recursive: true });
  fs.mkdirSync(path.join(ROOT, 'verification', 'results'), { recursive: true });

  const migrations = ['run-payments-migration.js', 'run-security-migration.js', 'run-business-migration.js'];
  for (const m of migrations) {
    try {
      runNode(m, `migrate:${m}`);
    } catch (e) {
      console.warn(`⚠ ${e.message} — continuing if already applied`);
    }
  }

  runNode('seed-test-users.js', 'seed:test-users');
  runNode('seed-realistic-data.js', 'seed:realistic-data');

  const skipServers = process.env.SKIP_SERVER_START === '1';
  if (!skipServers) {
    const apiUp = await probeUrl(`${API_URL}/health`);
    if (apiUp) {
      console.log(`API already running at ${API_URL}`);
    } else {
      startProcess('node', ['server.js'], ROOT, 'api');
    }
    startProcess('npm', ['run', 'dev'], FRONTEND, 'vite', {
      VITE_API_PROXY_TARGET: API_URL,
    });
    console.log('\nWaiting for API and Vite (proxy → local API)…');
    await waitForServers(API_URL, [UI_URL, UI_FALLBACK]);
    console.log(`✓ API ${API_URL}/health`);
    console.log(`✓ UI  ${UI_URL}`);
  } else {
    console.log('SKIP_SERVER_START=1 — assuming servers already running');
    await waitForServers(API_URL, [UI_URL, UI_FALLBACK]).catch(() => {
      throw new Error('API/UI not reachable. Start backend + vite with VITE_API_PROXY_TARGET=http://127.0.0.1:3000');
    });
  }

  const pwDir = path.join(ROOT, 'verification', 'playwright');
  const pwConfig = path.join(pwDir, 'playwright.config.js');
  console.log('\n▶ Playwright (headed Chrome)…\n');
  const pw = spawnSync(
    'npx',
    ['playwright', 'test', 'tests/full-execution.spec.js', '--config', pwConfig, '--headed', '--workers=1'],
    {
      cwd: pwDir,
      encoding: 'utf8',
      env: {
        ...process.env,
        SKIP_SERVER_START: undefined,
        UI_BASE_URL: UI_URL,
        VITE_API_PROXY_TARGET: API_URL,
      },
      stdio: 'inherit',
      shell: true,
    }
  );

  runNode('generate-execution-reports.js', 'generate reports');

  shutdown();

  console.log('\n══════════════════════════════════════════════════');
  console.log('Playwright exit code:', pw.status);
  console.log('Screenshots: verification/screenshots/');
  console.log('Results:     verification/results/browser-execution.json');
  console.log('Reports:     FINAL_SYSTEM_REPORT.md (+ API/RBAC/AUDIT/PERFORMANCE)');
  console.log('══════════════════════════════════════════════════\n');

  process.exit(pw.status === 0 ? 0 : 1);
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(130);
});

main().catch((err) => {
  console.error('\n✗ Browser execution failed:', err.message);
  shutdown();
  process.exit(1);
});
