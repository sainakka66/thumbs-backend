const { query } = require('../../lib/db/safeQuery');

async function logAudit({
  entityType,
  entityId,
  action,
  actorUserId,
  oldStatus,
  newStatus,
  details,
  ipAddress,
}) {
  await query(
    `INSERT INTO payment_audit_logs
     (entity_type, entity_id, action, actor_user_id, old_status, new_status, details, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entityType,
      entityId,
      action,
      actorUserId || null,
      oldStatus || null,
      newStatus || null,
      details ? JSON.stringify(details) : null,
      ipAddress || null,
    ]
  );
}

module.exports = { logAudit };
