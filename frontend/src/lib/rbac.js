/** Role slugs aligned with backend roles table */
export const ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SALESPERSON: 'SALESPERSON',
  DELIVERY: 'DELIVERY',
  DELIVERY_AGENT: 'DELIVERY',
  CUSTOMER: 'CUSTOMER',
};

const LEGACY = {
  admin: 'ADMIN',
  manager: 'MANAGER',
  distributor: 'MANAGER',
  user: 'SALESPERSON',
  salesperson: 'SALESPERSON',
  delivery_agent: 'DELIVERY',
  delivery: 'DELIVERY',
  customer: 'CUSTOMER',
};

export function normalizeRoleFromJwt(role) {
  if (!role) return 'SALESPERSON';
  const u = String(role).toUpperCase();
  if (u === 'DELIVERY_AGENT') return 'DELIVERY';
  if (ROLES[u]) return u;
  return LEGACY[String(role).toLowerCase()] || 'SALESPERSON';
}

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', section: 'Main', permission: 'dashboard.view' },
  { to: '/inventory', label: 'Inventory', icon: '📦', section: 'Operations', permission: 'inventory.view' },
  { to: '/sales', label: 'Sales', icon: '💰', permission: 'sales.view' },
  { to: '/deliveries', label: 'Deliveries', icon: '🚚', permission: ['deliveries.view', 'deliveries.view_own'] },
  { to: '/customers', label: 'Customers', icon: '🏪', section: 'Accounts', permission: 'customers.view' },
  { to: '/payments', label: 'UPI Payments', icon: '💳', permission: 'payments.view' },
  { to: '/reports', label: 'Reports', icon: '📈', permission: 'reports.view' },
  { to: '/notifications', label: 'Alerts', icon: '🔔', permission: 'notifications.view' },
];

export const ADMIN_NAV = [
  { to: '/users', label: 'User Management', icon: '👥', section: 'Admin', permission: 'users.manage' },
  { to: '/admin/audit', label: 'Audit Logs', icon: '📋', permission: 'audit.view' },
  { to: '/admin/payments', label: 'Payment Monitor', icon: '🛡️', permission: 'payments.view' },
  { to: '/admin/fraud', label: 'Fraud Review', icon: '⚠️', roles: ['ADMIN'] },
];

export const PORTAL_NAV = [
  { to: '/portal', label: 'My Portal', icon: '🏪', section: 'Customer', permission: 'portal.view' },
];

export function canAccess(permissions, role, item) {
  const normalized = normalizeRoleFromJwt(role);
  if (normalized === 'ADMIN') return true;
  if (item.roles && !item.roles.includes(normalized) && !item.roles.includes(role)) return false;
  if (!item.permission) return true;
  const perms = permissions || [];
  const needed = Array.isArray(item.permission) ? item.permission : [item.permission];
  return needed.some((p) => perms.includes(p));
}

export function filterNav(items, permissions, role) {
  return items.filter((item) => canAccess(permissions, role, item));
}

export function navForRole(permissions, role) {
  const normalized = normalizeRoleFromJwt(role);
  if (normalized === 'CUSTOMER') return filterNav(PORTAL_NAV, permissions, role);
  const main = filterNav(NAV_ITEMS, permissions, role);
  const admin = filterNav(ADMIN_NAV, permissions, role);
  return [...main, ...admin];
}
