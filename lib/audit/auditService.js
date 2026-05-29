const { queryRows } = require('../db/safeQuery');
const logger = require('../logger');

async function writeAudit(req, opts) {
  const {
    action,
    entityType,
    entityId = null,
    beforeValue = null,
    afterValue = null,
  } = opts;

  const userId = req.businessUser?.id || req.user?.id || null;
  const username = req.businessUser?.username || req.user?.username || null;

  try {
    await queryRows(
      `INSERT INTO audit_logs
       (user_id, username, action, entity_type, entity_id, before_value, after_value, ip_address, device_fingerprint, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        username,
        action,
        entityType,
        entityId != null ? String(entityId) : null,
        beforeValue ? JSON.stringify(beforeValue) : null,
        afterValue ? JSON.stringify(afterValue) : null,
        req.clientIp || req.ip || null,
        req.deviceFingerprint || req.headers?.['x-device-fingerprint'] || null,
        req.userAgent || req.headers?.['user-agent']?.slice(0, 512) || null,
      ]
    );
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      logger.warn({ action, entityType }, 'audit_logs_table_missing');
      return;
    }
    logger.error({ err: err.message, action }, 'audit_write_failed');
  }
}

function auditMiddleware(action, entityType, getEntityId, getPayload) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function patchedJson(body) {
      if (res.statusCode < 400 && (body?.success !== false)) {
        const { before, after } = getPayload ? getPayload(req, body) : { before: null, after: body };
        writeAudit(req, {
          action,
          entityType,
          entityId: getEntityId ? getEntityId(req, body) : null,
          beforeValue: before,
          afterValue: after,
        }).catch(() => {});
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { writeAudit, auditMiddleware };
