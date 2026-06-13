const BACKEND = 'https://thumbs-backend.onrender.com';

async function j(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  const t = await r.text();
  let b; try { b = JSON.parse(t); } catch { b = { raw: t.slice(0, 300) }; }
  return { status: r.status, body: b };
}

(async () => {
  const bad = await j(`${BACKEND}/login`, { method: 'POST', body: JSON.stringify({ username: 'x', password: 'y' }) });
  console.log('bad login', bad.status);

  const good = await j(`${BACKEND}/login`, {
    method: 'POST',
    body: JSON.stringify({ username: 'sales_sai', password: 'Tu!Proof2026x' }),
  });
  console.log('sales login', good.status, good.body?.success, good.body?.message?.slice?.(0, 50));
  if (!good.body?.token) return;

  const customers = await j(`${BACKEND}/customers`, {
    headers: { Authorization: `Bearer ${good.body.token}` },
  });
  console.log('customers', customers.status, Array.isArray(customers.body) ? customers.body.length : JSON.stringify(customers.body).slice(0, 200));

  const cid = Array.isArray(customers.body) ? customers.body[0]?.id : customers.body?.customers?.[0]?.id;
  if (!cid) return;

  const order = await j(`${BACKEND}/payments/create-order`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${good.body.token}` },
    body: JSON.stringify({ amount: 1, customerId: cid, idempotencyKey: `probe_${Date.now()}` }),
  });
  console.log('create-order', order.status, JSON.stringify(order.body).slice(0, 400));
})();
