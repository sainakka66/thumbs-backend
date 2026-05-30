const express = require('express');
const { protect } = require('../lib/rbac/protect');
const { requireRole } = require('../lib/rbac/requireRole');
const loadBusinessUser = require('../lib/rbac/loadBusinessUser');
const { writeAudit } = require('../lib/audit/auditService');
const dashboardService = require('./services/dashboardService');
const searchService = require('./services/searchService');
const reportService = require('./services/reportService');
const notificationService = require('./services/notificationService');
const stockAlertService = require('./services/stockAlertService');
const pdfService = require('./services/pdfService');
const adminDashboardService = require('./services/adminDashboardService');
const dashboardSummaryService = require('./services/dashboardSummaryService');
const { createUsersRoutes } = require('./routes/usersRoutes');
const { queryRows } = require('../lib/db/safeQuery');
const { getPool } = require('../lib/db');

function requestContext(req, res, next) {
  req.clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip;
  req.deviceFingerprint = req.headers['x-device-fingerprint'] || null;
  req.userAgent = req.headers['user-agent'];
  next();
}

function mountBusiness(app, { verifyToken, db }) {
  app.use(requestContext);

  const router = express.Router();

  router.get(
    '/dashboard/executive',
    ...protect(verifyToken, 'dashboard.view', async (req, res) => {
      try {
        const data = await dashboardService.getExecutiveDashboard();
        res.json({ success: true, ...data });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  // Aggregated single-request dashboard payload (replaces executive + admin + notifications).
  router.get(
    '/dashboard/summary',
    ...protect(verifyToken, 'dashboard.view', async (req, res) => {
      try {
        const includeAdmin =
          req.roleSlug === 'ADMIN' || (req.permissions || []).includes('users.manage');
        const data = await dashboardSummaryService.getDashboardSummary({
          userId: req.businessUser?.id || null,
          includeAdmin,
        });
        res.json({ success: true, ...data });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  router.get(
    '/search',
    ...protect(verifyToken, 'dashboard.view', async (req, res) => {
      try {
        const q = req.query.q || '';
        const results = await searchService.globalSearch(
          q,
          req.permissions,
          req.businessUser.id,
          req.roleSlug
        );
        res.json({ success: true, query: q, results });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  router.get(
    '/stock-alerts',
    ...protect(verifyToken, 'inventory.view', async (req, res) => {
      try {
        const alerts = await stockAlertService.listActiveAlerts();
        res.json({ success: true, alerts });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  router.post(
    '/stock-alerts/sync',
    ...protect(verifyToken, 'inventory.update', async (req, res) => {
      try {
        const alerts = await stockAlertService.syncStockAlerts();
        res.json({ success: true, count: alerts.length, alerts });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  router.get(
    '/notifications',
    ...protect(verifyToken, 'notifications.view', async (req, res) => {
      try {
        const items = await notificationService.listForUser(req.businessUser.id, {
          unreadOnly: req.query.unread === '1',
        });
        const unreadCount = await notificationService.countUnread(req.businessUser.id);
        res.json({ success: true, items, unreadCount });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  router.patch(
    '/notifications/:id/read',
    ...protect(verifyToken, 'notifications.view', async (req, res) => {
      try {
        await notificationService.markRead(parseInt(req.params.id, 10), req.businessUser.id);
        res.json({ success: true });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  router.post(
    '/notifications/read-all',
    ...protect(verifyToken, 'notifications.view', async (req, res) => {
      try {
        await notificationService.markAllRead(req.businessUser.id);
        res.json({ success: true });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  router.get(
    '/audit/logs',
    ...protect(verifyToken, 'audit.view', async (req, res) => {
      try {
        const limit = Math.min(parseInt(req.query.limit || '50', 10), 500);
        const offset = parseInt(req.query.offset || '0', 10);
        const conditions = [];
        const params = [];

        if (req.query.userId) {
          conditions.push('user_id = ?');
          params.push(parseInt(req.query.userId, 10));
        }
        if (req.query.action) {
          conditions.push('action = ?');
          params.push(req.query.action);
        }
        if (req.query.entityType) {
          conditions.push('entity_type = ?');
          params.push(req.query.entityType);
        }
        if (req.query.from) {
          conditions.push('created_at >= ?');
          params.push(req.query.from);
        }
        if (req.query.to) {
          conditions.push('created_at <= ?');
          params.push(req.query.to);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const countRows = await queryRows(
          `SELECT COUNT(*) AS total FROM audit_logs ${where}`,
          params
        );
        const total = countRows[0]?.total || 0;

        const listParams = [...params, limit, offset];
        const rows = await queryRows(
          `SELECT id, user_id, username, action, entity_type, entity_id,
                  before_value, after_value, ip_address, device_fingerprint, user_agent, created_at
           FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          listParams
        );

        if ((req.query.format || '').toLowerCase() === 'csv') {
          const header = 'id,created_at,username,user_id,action,entity_type,entity_id,ip_address\n';
          const lines = rows.map((r) =>
            [
              r.id,
              r.created_at,
              JSON.stringify(r.username || ''),
              r.user_id,
              r.action,
              r.entity_type,
              r.entity_id,
              r.ip_address,
            ].join(',')
          );
          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
          return res.send(header + lines.join('\n'));
        }

        res.json({ success: true, logs: rows, total, limit, offset });
      } catch (e) {
        if (e.code === 'ER_NO_SUCH_TABLE') {
          return res.json({ success: true, logs: [], total: 0 });
        }
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  router.get(
    '/dashboard/admin',
    ...protect(verifyToken, 'users.manage', async (_req, res) => {
      try {
        const data = await adminDashboardService.getAdminDashboard();
        res.json({ success: true, ...data });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  router.get(
    '/reports/:type',
    ...protect(verifyToken, 'reports.view', async (req, res) => {
      try {
        const { type } = req.params;
        const range = req.query.range || 'month';
        const from = req.query.from;
        const to = req.query.to;
        const format = (req.query.format || 'json').toLowerCase();

        let rows = [];
        let columns = [];
        if (type === 'sales') {
          rows = await reportService.salesReport(range, from, to);
          columns = ['id', 'customer_name', 'product_name', 'quantity', 'total_amount', 'amount_paid', 'payment_mode', 'created_at'];
        } else if (type === 'inventory') {
          rows = await reportService.inventoryReport();
          columns = ['id', 'name', 'sku', 'quantity', 'price', 'reorder', 'value'];
        } else if (type === 'customers') {
          rows = await reportService.customerReport();
          columns = ['id', 'shop_name', 'owner_name', 'phone', 'outstanding_balance'];
        } else if (type === 'deliveries') {
          rows = await reportService.deliveryReport(range, from, to);
          columns = ['id', 'customer_name', 'product_name', 'quantity', 'status', 'delivery_date'];
        } else {
          return res.status(404).json({ success: false, message: 'Unknown report type' });
        }

        if (format === 'csv' || format === 'excel') {
          const csv = reportService.toCsv(rows, columns);
          const mime =
            format === 'excel'
              ? 'application/vnd.ms-excel'
              : 'text/csv';
          res.setHeader('Content-Type', mime);
          res.setHeader('Content-Disposition', `attachment; filename="${type}-report.csv"`);
          return res.send(csv);
        }

        res.json({ success: true, type, rows });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  router.get(
    '/pdf/sales-invoice/:id',
    ...protect(verifyToken, 'sales.view', async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        const [sale] = await queryRows('SELECT * FROM sales WHERE id = ?', [id]);
        if (!sale) return res.status(404).json({ success: false, message: 'Not found' });
        const [customer] = await queryRows('SELECT * FROM customers WHERE id = ?', [sale.customer_id]);
        pdfService.sendPdf(res, `invoice-${id}.pdf`, (doc) =>
          pdfService.buildSalesInvoice(doc, sale, customer)
        );
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  router.get(
    '/pdf/delivery-challan/:id',
    ...protect(verifyToken, 'deliveries.view', async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        const [delivery] = await queryRows('SELECT * FROM deliveries WHERE id = ?', [id]);
        if (!delivery) return res.status(404).json({ success: false, message: 'Not found' });
        const [customer] = await queryRows('SELECT * FROM customers WHERE id = ?', [delivery.customer_id]);
        pdfService.sendPdf(res, `challan-${id}.pdf`, (doc) =>
          pdfService.buildDeliveryChallan(doc, delivery, customer)
        );
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  router.get(
    '/pdf/inventory-report',
    ...protect(verifyToken, 'reports.export', async (req, res) => {
      try {
        const rows = await reportService.inventoryReport();
        pdfService.sendPdf(res, 'inventory-report.pdf', (doc) =>
          pdfService.buildInventoryReport(doc, rows)
        );
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  router.get(
    '/pdf/customer-statement/:id',
    ...protect(verifyToken, 'customers.view', async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        const [customer] = await queryRows('SELECT * FROM customers WHERE id = ?', [id]);
        if (!customer) return res.status(404).json({ success: false, message: 'Not found' });
        const sales = await queryRows(
          'SELECT * FROM sales WHERE customer_id = ? ORDER BY id DESC LIMIT 50',
          [id]
        );
        pdfService.sendPdf(res, `statement-${id}.pdf`, (doc) =>
          pdfService.buildCustomerStatement(doc, customer, sales)
        );
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  router.post(
    '/auth/change-password',
    verifyToken,
    loadBusinessUser,
    async (req, res) => {
      try {
        const bcrypt = require('bcrypt');
        const { validatePassword } = require('../config');
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) {
          return res.status(400).json({ success: false, message: 'Current and new password required' });
        }
        const policyError = validatePassword(newPassword);
        if (policyError) return res.status(400).json({ success: false, message: policyError });

        const [rows] = await queryRows(
          'SELECT id, password FROM users WHERE id = ? LIMIT 1',
          [req.businessUser.id]
        );
        const user = rows[0];
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        const { isBcryptHash } = require('../config');
        let match = false;
        if (isBcryptHash(user.password)) {
          match = await bcrypt.compare(String(currentPassword), user.password);
        } else {
          match = String(currentPassword) === String(user.password);
        }
        if (!match) return res.status(400).json({ success: false, message: 'Current password is incorrect' });

        const hash = await bcrypt.hash(String(newPassword), parseInt(process.env.BCRYPT_ROUNDS || '12', 10));
        await queryRows('UPDATE users SET password = ? WHERE id = ?', [hash, user.id]);
        await writeAudit(req, {
          action: 'user_password_change',
          entityType: 'user',
          entityId: user.id,
        });
        res.json({ success: true, message: 'Password updated' });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    }
  );

  router.get(
    '/rbac/me',
    ...protect(verifyToken, 'dashboard.view', async (req, res) => {
      res.json({
        success: true,
        user: {
          id: req.businessUser.id,
          username: req.businessUser.username,
          role: req.roleSlug,
        },
        permissions: [...req.permissions],
      });
    })
  );

  router.put(
    '/deliveries/:id',
    ...protect(verifyToken, 'deliveries.update', async (req, res) => {
      try {
        const id = parseInt(req.params.id, 10);
        const [existing] = await queryRows('SELECT * FROM deliveries WHERE id = ?', [id]);
        if (!existing) return res.status(404).json({ success: false, message: 'Not found' });

        if (
          (req.roleSlug === 'DELIVERY_AGENT' || req.roleSlug === 'DELIVERY') &&
          existing.assigned_user_id &&
          existing.assigned_user_id !== req.businessUser.id
        ) {
          return res.status(403).json({ success: false, message: 'Not your delivery' });
        }

        const { status, notes, driver_name, vehicle_no } = req.body || {};
        await queryRows(
          `UPDATE deliveries SET status = COALESCE(?, status), notes = COALESCE(?, notes),
           driver_name = COALESCE(?, driver_name), vehicle_no = COALESCE(?, vehicle_no)
           WHERE id = ?`,
          [status, notes, driver_name, vehicle_no, id]
        );

        await writeAudit(req, {
          action: status && String(status).toLowerCase().includes('complet') ? 'delivery_completed' : 'delivery_updated',
          entityType: 'delivery',
          entityId: id,
          beforeValue: existing,
          afterValue: { status, notes },
        });

        if (status && String(status).toLowerCase().includes('complet')) {
          await notificationService.createNotification({
            userId: req.businessUser.id,
            type: 'delivery_completed',
            title: 'Delivery completed',
            message: `Delivery #${id} marked completed`,
            entityType: 'delivery',
            entityId: id,
          });
        }

        res.json({ success: true });
      } catch (e) {
        res.status(500).json({ success: false, message: e.message });
      }
    })
  );

  app.use('/users', createUsersRoutes({ verifyToken }));
  app.use(router);

  /** Login audit hook — called from server after successful login */
  app.auditLogin = async (req, userId, username) => {
    req.businessUser = { id: userId, username };
    req.user = { id: userId, username };
    await writeAudit(req, {
      action: 'login',
      entityType: 'user',
      entityId: userId,
      afterValue: { username },
    });
  };

  app.auditLogout = async (req) => {
    await writeAudit(req, {
      action: 'logout',
      entityType: 'user',
      entityId: req.user?.id,
    });
  };

  return app;
}

module.exports = { mountBusiness };
