const { queryRows } = require('../db/safeQuery');

let tablesChecked = false;
let tablesAvailable = false;

async function checkCooldownTable() {
  if (tablesChecked) return tablesAvailable;
  tablesChecked = true;
  try {
    const rows = await queryRows(
      `SELECT 1 AS ok FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rate_limit_cooldowns' LIMIT 1`
    );
    tablesAvailable = rows.length > 0;
  } catch {
    tablesAvailable = false;
  }
  return tablesAvailable;
}

async function isCoolingDown(limiterName, scopeKey) {
  if (!(await checkCooldownTable())) return false;
  try {
    await queryRows(
      `DELETE FROM rate_limit_cooldowns
       WHERE limiter_name = ? AND blocked_until <= NOW(3)`,
      [limiterName]
    );
    const rows = await queryRows(
      `SELECT 1 AS ok FROM rate_limit_cooldowns
       WHERE limiter_name = ? AND scope_key = ? AND blocked_until > NOW(3)
       LIMIT 1`,
      [limiterName, scopeKey]
    );
    return rows.length > 0;
  } catch {
    return false;
  }
}

async function setCooldown(limiterName, scopeKey, untilMs) {
  if (!(await checkCooldownTable())) return;
  const blockedUntil = new Date(untilMs);
  try {
    await queryRows(
      `INSERT INTO rate_limit_cooldowns (limiter_name, scope_key, blocked_until)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE blocked_until = VALUES(blocked_until)`,
      [limiterName, scopeKey, blockedUntil]
    );
  } catch {
    /* ignore */
  }
}

function resetTableCheck() {
  tablesChecked = false;
}

module.exports = { isCoolingDown, setCooldown, resetTableCheck };
