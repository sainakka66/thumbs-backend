const { query, queryRows } = require('../../lib/db/safeQuery');

async function isBlocked(entityType, entityValue) {
  if (!entityValue) return false;
  const rows = await queryRows(
    `SELECT id FROM blocked_entities
     WHERE entity_type = ? AND entity_value = ? AND is_active = 1
       AND (expires_at IS NULL OR expires_at > NOW())
       AND deleted_at IS NULL
     LIMIT 1`,
    [entityType, String(entityValue)]
  );
  return rows.length > 0;
}

async function blockEntity({ entityType, entityValue, reason, blockedBy, expiresAt }) {
  await query(
    `INSERT INTO blocked_entities (entity_type, entity_value, reason, blocked_by, expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       is_active = 1, reason = VALUES(reason), blocked_by = VALUES(blocked_by),
       expires_at = VALUES(expires_at), deleted_at = NULL, updated_at = NOW()`,
    [entityType, String(entityValue), reason || null, blockedBy || null, expiresAt || null]
  );
}

async function unblockEntity(entityType, entityValue) {
  await query(
    `UPDATE blocked_entities SET is_active = 0, deleted_at = NOW()
     WHERE entity_type = ? AND entity_value = ?`,
    [entityType, String(entityValue)]
  );
}

module.exports = { isBlocked, blockEntity, unblockEntity };
