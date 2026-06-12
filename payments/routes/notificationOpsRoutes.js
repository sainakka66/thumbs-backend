const express = require('express');
const { requirePermission } = require('../../lib/rbac/requirePermission');
const { privilegedAudit } = require('../middleware/privilegedAudit');
const notificationRepo = require('../repositories/notificationRepository');
const { processOneNotification } = require('../notifications/notificationWorker');

function createNotificationOpsRoutes({ verifyToken, loadAuthUser }) {
  const router = express.Router();
  router.use(verifyToken, loadAuthUser);

  router.get('/', requirePermission('notifications.view'), async (req, res, next) => {
    try {
      const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
      const status = req.query.status || null;
      const { queryRows } = require('../../lib/db/safeQuery');
      const params = [];
      let sql = `SELECT * FROM notification_queue`;
      if (status) {
        sql += ` WHERE status = ?`;
        params.push(status);
      }
      sql += ` ORDER BY created_at DESC LIMIT ?`;
      params.push(limit);
      const rows = await queryRows(sql, params);
      res.json({ success: true, notifications: rows });
    } catch (e) {
      next(e);
    }
  });

  router.post(
    '/retry',
    requirePermission('notifications.retry'),
    privilegedAudit('notification_retry', { entityType: 'notification_queue', entityIdFrom: (req) => req.body?.notificationId }),
    async (req, res, next) => {
      try {
        const notificationId = parseInt(req.body?.notificationId, 10);
        if (!notificationId) return res.status(400).json({ success: false, message: 'notificationId required' });
        const { queryRows } = require('../../lib/db/safeQuery');
        const rows = await queryRows(`SELECT * FROM notification_queue WHERE id = ? LIMIT 1`, [notificationId]);
        const row = rows[0];
        if (!row) return res.status(404).json({ success: false, message: 'Notification not found' });
        await notificationRepo.updateNotification(notificationId, { status: 'PENDING', retryCount: row.retry_count || 0 });
        const result = await processOneNotification({ ...row, status: 'PENDING' });
        res.json({ success: true, result });
      } catch (e) {
        next(e);
      }
    }
  );

  return router;
}

module.exports = createNotificationOpsRoutes;
