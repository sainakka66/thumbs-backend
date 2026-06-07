/**
 * Verify production login after roadmap migrations (no secrets in output).
 */
const API = process.env.API_BASE || 'https://thumbs-backend.onrender.com';
const username = process.env.TEST_USER || 'admin_sai';
const password = process.env.TEST_PASSWORD;

async function loginOnce(label, fingerprint) {
  const headers = { 'Content-Type': 'application/json' };
  if (fingerprint) headers['x-device-fingerprint'] = fingerprint;
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ username, password }),
  });
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 200) };
  }
  return { label, status: res.status, body };
}

async function main() {
  if (!password) {
    console.error('Set TEST_PASSWORD env var');
    process.exit(2);
  }
  const fp = `hotfix-verify-${Date.now()}`;
  const results = [
    await loginOnce('new_device', fp),
    await loginOnce('same_device', fp),
  ];
  for (const r of results) {
    const summary = {
      label: r.label,
      status: r.status,
      success: r.body?.success,
      challengeRequired: r.body?.challengeRequired,
      code: r.body?.code,
      message: r.body?.message,
      hasToken: Boolean(r.body?.token),
    };
    console.log(JSON.stringify(summary));
    if (r.status >= 500) {
      console.error('FAIL: server error', r.body);
      process.exit(1);
    }
  }
  const any500 = results.some((r) => r.status >= 500);
  if (any500) process.exit(1);
  console.log('LOGIN_VERIFY_OK');
}

main().catch((e) => {
  console.error('LOGIN_VERIFY_FAILED', e.message);
  process.exit(1);
});
