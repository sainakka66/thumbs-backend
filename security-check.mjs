/**
 * API security checks — delivery routes + DELETE auth regression.
 * Run: node security-check.mjs
 * Requires local server: node server.js  (API_URL defaults to http://localhost:3000)
 */
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const API = process.env.API_URL || 'http://localhost:3000';
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error('Set JWT_SECRET in .env (min 32 chars) before running security-check.mjs');
  process.exit(1);
}

const deliveryRoutes = [
  { method: 'GET', path: '/deliveries' },
  { method: 'POST', path: '/deliveries', body: { customer_id: 1, product_name: 'x', quantity: 1 } },
  { method: 'DELETE', path: '/deliveries/999999' },
];

const results = { passed: [], failed: [] };

function pass(msg) {
  results.passed.push(msg);
  console.log('PASS', msg);
}
function fail(msg, detail) {
  results.failed.push({ msg, detail });
  console.log('FAIL', msg, detail || '');
}

async function request(method, route, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API + route, opts);
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function main() {
  console.log('=== Delivery API security checks ===');
  console.log('API:', API, '\n');

  const validToken = jwt.sign({ id: 1, username: 'admin' }, SECRET, { expiresIn: '1h' });
  const invalidToken = 'not.a.valid.jwt';

  for (const route of deliveryRoutes) {
    const label = `${route.method} ${route.path}`;

    const noAuth = await request(route.method, route.path, { body: route.body });
    if (noAuth.status === 403) {
      pass(`${label} without token → 403 Forbidden`);
    } else {
      fail(`${label} without token should be 403`, `got ${noAuth.status}`);
    }

    const badAuth = await request(route.method, route.path, {
      token: invalidToken,
      body: route.body,
    });
    if (badAuth.status === 401) {
      pass(`${label} with invalid token → 401 Unauthorized`);
    } else {
      fail(`${label} with invalid token should be 401`, `got ${badAuth.status}`);
    }

    const goodAuth = await request(route.method, route.path, {
      token: validToken,
      body: route.body,
    });
    if (goodAuth.status < 400) {
      pass(`${label} with valid token → ${goodAuth.status} (not blocked by auth)`);
    } else if (route.method === 'DELETE' && goodAuth.status === 404) {
      pass(`${label} with valid token → auth OK (404 id not found is acceptable)`);
    } else {
      fail(`${label} with valid token should not be 401/403`, `got ${goodAuth.status}`);
    }
  }

  // Confirm server.js registers verifyToken on DELETE
  const src = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  if (/app\.delete\('\/deliveries\/:id',\s*verifyToken/.test(src)) {
    pass('server.js: DELETE /deliveries/:id uses verifyToken middleware');
  } else {
    fail('server.js: DELETE /deliveries/:id missing verifyToken in source');
  }

  const getOk = /app\.get\('\/deliveries',\s*verifyToken/.test(src);
  const postOk = /app\.post\('\/deliveries',\s*verifyToken/.test(src);
  if (getOk) pass('server.js: GET /deliveries uses verifyToken');
  else fail('server.js: GET /deliveries missing verifyToken');
  if (postOk) pass('server.js: POST /deliveries uses verifyToken');
  else fail('server.js: POST /deliveries missing verifyToken');

  console.log('\n========== SUMMARY ==========');
  console.log('Passed:', results.passed.length);
  console.log('Failed:', results.failed.length);
  if (results.failed.length) {
    results.failed.forEach((f) => console.log(' -', f.msg, f.detail || ''));
    process.exit(1);
  }
  console.log('\nAll delivery API security checks passed.');
}

main().catch((e) => {
  console.error('Security check aborted:', e.message);
  console.error('Start API: node server.js');
  process.exit(1);
});
