const { queryRows } = require('../db/safeQuery');
const { normalizeRoleSlug } = require('./roleMap');

const cache = new Map();
const TTL_MS = 5 * 60 * 1000;

async function loadPermissionsForUser(user) {
  const cacheKey = `${user.id}:${user.role_id || user.role}`;
  const hit = cache.get(cacheKey);
  if (hit && hit.expires > Date.now()) {
    return hit.data;
  }

  let roleSlug = normalizeRoleSlug(user.role);
  let permissions = [];

  try {
    if (user.role_id) {
      const [roleRows] = await queryRows(
        `SELECT r.slug FROM roles r WHERE r.id = ? LIMIT 1`,
        [user.role_id]
      );
      if (roleRows[0]?.slug) roleSlug = roleRows[0].slug;
    } else {
      const [roleRows] = await queryRows(
        `SELECT r.id, r.slug FROM roles r WHERE r.slug = ? OR LOWER(r.slug) = LOWER(?) LIMIT 1`,
        [roleSlug, user.role || '']
      );
      if (roleRows[0]) {
        roleSlug = roleRows[0].slug;
        user.role_id = roleRows[0].id;
      }
    }

    const rows = await queryRows(
      `SELECT p.slug FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN roles r ON r.id = rp.role_id
       WHERE r.slug = ?`,
      [roleSlug]
    );
    permissions = rows.map((r) => r.slug);
  } catch (err) {
    if (err.code === 'ER_NO_SUCH_TABLE') {
      permissions = fallbackPermissions(roleSlug);
    } else {
      throw err;
    }
  }

  if (!permissions.length) {
    permissions = fallbackPermissions(roleSlug);
  }

  const data = { roleSlug, permissions: new Set(permissions) };
  cache.set(cacheKey, { data, expires: Date.now() + TTL_MS });
  return data;
}

function fallbackPermissions(roleSlug) {
  const all = [
    'dashboard.view', 'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete',
    'customers.view', 'customers.create', 'customers.update', 'customers.delete',
    'sales.view', 'sales.create', 'sales.delete',
    'deliveries.view', 'deliveries.create', 'deliveries.update', 'deliveries.delete',
    'reports.view', 'reports.export', 'audit.view', 'notifications.view', 'users.manage', 'payments.view',
  ];
  const paymentPlatform = [
    'payments.create', 'payments.view.self', 'payments.view.all', 'payments.capture',
    'payments.refund.create', 'payments.refund.approve', 'payments.refund.execute',
    'payments.refunds.view', 'ledger.view', 'ledger.post', 'ledger.reverse',
    'settlement.view', 'settlement.execute', 'reconciliation.view', 'reconciliation.run',
    'webhook.view', 'webhook.replay', 'notifications.retry', 'admin.override',
  ];
  const map = {
    ADMIN: [...new Set([...all, ...paymentPlatform])],
    MANAGER: all.filter((p) => p !== 'users.manage' && p !== 'audit.view'),
    MANAGER_FULL: [
      'dashboard.view', 'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete',
      'customers.view', 'customers.create', 'customers.update', 'customers.delete',
      'sales.view', 'sales.create', 'sales.delete',
      'deliveries.view', 'deliveries.create', 'deliveries.update', 'deliveries.delete',
      'reports.view', 'reports.export', 'notifications.view', 'payments.view',
    ],
    SALESPERSON: [
      'dashboard.view', 'inventory.view', 'customers.view', 'customers.create', 'customers.update',
      'sales.view', 'sales.create', 'notifications.view', 'payments.view',
    ],
    DELIVERY_AGENT: ['dashboard.view', 'deliveries.view_own', 'deliveries.update', 'notifications.view'],
    DELIVERY: ['dashboard.view', 'deliveries.view_own', 'deliveries.update', 'notifications.view'],
    CUSTOMER: ['portal.view', 'payments.create', 'payments.view.self'],
    MERCHANT: ['payments.view.self', 'payments.refunds.view', 'settlement.view'],
    SUPPORT: ['payments.view.all', 'payments.refunds.view', 'notifications.view', 'notifications.retry', 'audit.view'],
    FINANCE: [
      'payments.view.all', 'payments.refunds.view', 'ledger.view', 'settlement.view',
      'settlement.execute', 'reconciliation.view', 'reconciliation.run',
    ],
    SUPER_ADMIN: all.concat([
      'payments.create', 'payments.view.self', 'payments.view.all', 'payments.capture',
      'payments.refund.create', 'payments.refund.approve', 'payments.refund.execute',
      'payments.refunds.view', 'ledger.view', 'ledger.post', 'ledger.reverse',
      'settlement.view', 'settlement.execute', 'reconciliation.view', 'reconciliation.run',
      'webhook.view', 'webhook.replay', 'notifications.retry', 'admin.override',
    ]),
  };
  const key = roleSlug === 'DELIVERY_AGENT' ? 'DELIVERY' : roleSlug;
  return map[key] || map.SALESPERSON;
}

function clearPermissionCache(userId) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${userId}:`)) cache.delete(key);
  }
}

module.exports = { loadPermissionsForUser, clearPermissionCache, fallbackPermissions };
