require('dotenv').config();
const { runFullReconciliation } = require('../payments/reconciliation/reconciliationService');

async function main() {
  const result = await runFullReconciliation({ triggerSource: process.env.RECON_TRIGGER || 'CRON' });
  console.log(JSON.stringify({ ok: true, ...result }, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
