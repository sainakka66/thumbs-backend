const { query, queryRows } = require('../../lib/db/safeQuery');
const { randomUuid } = require('../utils/crypto');

async function logAudit({
  domain = 'payments',
  entityType,
  entityId,
  action,
  actorUserId,
  oldState,
  newState,
  correlationId,
  ipAddress,
  metadata,
}) {
  const auditUuid = randomUuid();
  await query(
    `INSERT INTO payment_domain_audit_logs (
      audit_uuid, domain, entity_type, entity_id, action, actor_user_id,
      old_state, new_state, correlation_id, ip_address, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      auditUuid,
      domain,
      entityType,
      entityId,
      action,
      actorUserId || null,
      oldState ? JSON.stringify(oldState) : null,
      newState ? JSON.stringify(newState) : null,
      correlationId || null,
      ipAddress || null,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
  return auditUuid;
}

async function listByEntity(entityType, entityId, limit = 50) {
  return queryRows(
    `SELECT * FROM payment_domain_audit_logs WHERE entity_type = ? AND entity_id = ? ORDER BY created_at DESC LIMIT ?`,
    [entityType, entityId, Math.min(limit, 200)]
  );
}

async function listByCorrelationId(correlationId) {
  return queryRows(`SELECT * FROM payment_domain_audit_logs WHERE correlation_id = ? ORDER BY created_at ASC`, [correlationId]);
}

module.exports = { logAudit, listByEntity, listByCorrelationId };
