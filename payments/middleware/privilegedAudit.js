const unifiedAuditRepo = require('../repositories/unifiedAuditRepository');

function privilegedAudit(action, { entityType = 'payment_platform', entityIdFrom } = {}) {
  return (req, res, next) => {
    res.on('finish', () => {
      if (res.statusCode >= 400) return;
      const entityId =
        typeof entityIdFrom === 'function'
          ? entityIdFrom(req)
          : entityIdFrom || req.params?.id || req.params?.orderUuid || req.body?.orderUuid || null;
      unifiedAuditRepo
        .logAudit({
          domain: 'payments',
          entityType,
          entityId: entityId != null ? String(entityId) : null,
          action,
          actorUserId: req.authUser?.id || null,
          correlationId: req.correlationId,
          ipAddress: req.clientIp,
          metadata: {
            path: req.path,
            method: req.method,
            roleSlug: req.roleSlug,
            status: res.statusCode,
          },
        })
        .catch(() => {});
    });
    next();
  };
}

module.exports = { privilegedAudit };
