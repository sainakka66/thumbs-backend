const { queryRows } = require('../db/safeQuery');
const logger = require('../logger');

const SECURITY_EVENTS = new Set([
  'login',
  'logout',
  'login_failed',
  'login_locked',
  'mfa_enroll_totp',
  'mfa_enroll_email',
  'mfa_verify',
  'mfa_backup_used',
  'session_revoke',
  'session_revoke_all',
  'device_trusted',
  'device_verify',
  'device_new_detected',
  'permission_change',
  'customer_create',
  'customer_update',
  'product_update',
  'sale_create',
  'delivery_update',
  'suspicious_login',
]);

async function logSecurityEvent(req, event) {
  const {
    eventType,
    userId = null,
    username = null,
    entityType = null,
    entityId = null,
    payload = null,
  } = event;

  if (!SECURITY_EVENTS.has(eventType)) {
    logger.warn({ eventType }, 'unknown_security_event_type');
  }

  try {
    await queryRows(
      `INSERT INTO security_audit_events
       (event_type, user_id, username, entity_type, entity_id, payload, ip_address, device_fingerprint, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        eventType,
        userId,
        username,
        entityType,
        entityId != null ? String(entityId) : null,
        payload ? JSON.stringify(payload) : null,
        req?.clientIp || req?.ip || null,
        req?.deviceFingerprint || req?.headers?.['x-device-fingerprint'] || null,
        (req?.userAgent || req?.headers?.['user-agent'] || '').slice(0, 512) || null,
      ]
    );
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') return;
    logger.error({ err: err.message, eventType }, 'security_audit_write_failed');
  }

  const { writeAudit } = require('../audit/auditService');
  const auditAction = eventType.replace(/_/g, '.');
  writeAudit(req, {
    action: auditAction.length > 64 ? eventType : auditAction,
    entityType: entityType || 'security',
    entityId: entityId || userId,
    afterValue: payload,
  }).catch(() => {});
}

module.exports = { logSecurityEvent, SECURITY_EVENTS };
