/**
 * Canonical API catalog for verification runners.
 * auth: none | jwt | admin
 * permission: slug or array (any grants access)
 * expectRoles: optional role-specific expected status overrides
 */
module.exports = [
  { id: 'health', feature: 'Health check', method: 'GET', path: '/health', auth: 'none', permission: null },
  { id: 'login', feature: 'Login', method: 'POST', path: '/login', auth: 'none', permission: null, body: { username: '{{user}}', password: '{{pass}}' } },
  { id: 'logout', feature: 'Logout', method: 'POST', path: '/logout', auth: 'jwt', permission: null },

  { id: 'products-list', feature: 'List products', method: 'GET', path: '/products', auth: 'jwt', permission: 'inventory.view' },
  { id: 'products-stats', feature: 'Product stats', method: 'GET', path: '/products/stats', auth: 'jwt', permission: 'inventory.view' },
  { id: 'inventory-list', feature: 'Inventory list', method: 'GET', path: '/inventory', auth: 'jwt', permission: 'inventory.view' },
  { id: 'customers-list', feature: 'List customers', method: 'GET', path: '/customers', auth: 'jwt', permission: 'customers.view' },
  { id: 'sales-list', feature: 'List sales', method: 'GET', path: '/sales', auth: 'jwt', permission: 'sales.view' },
  { id: 'deliveries-list', feature: 'List deliveries', method: 'GET', path: '/deliveries', auth: 'jwt', permission: ['deliveries.view', 'deliveries.view_own'] },

  { id: 'dashboard-recent', feature: 'Dashboard recent sales', method: 'GET', path: '/dashboard/recent-sales', auth: 'jwt', permission: 'dashboard.view' },
  { id: 'dashboard-executive', feature: 'Executive dashboard', method: 'GET', path: '/dashboard/executive', auth: 'jwt', permission: 'dashboard.view' },
  { id: 'dashboard-top', feature: 'Top customers', method: 'GET', path: '/dashboard/top-customers', auth: 'jwt', permission: 'dashboard.view' },
  { id: 'dashboard-revenue', feature: 'Today revenue', method: 'GET', path: '/dashboard/today-revenue', auth: 'jwt', permission: 'dashboard.view' },
  { id: 'dashboard-weekly', feature: 'Weekly sales', method: 'GET', path: '/dashboard/weekly-sales', auth: 'jwt', permission: 'dashboard.view' },

  { id: 'search', feature: 'Global search', method: 'GET', path: '/search?q=test', auth: 'jwt', permission: 'dashboard.view' },
  { id: 'stock-alerts', feature: 'Stock alerts', method: 'GET', path: '/stock-alerts', auth: 'jwt', permission: 'inventory.view' },
  { id: 'notifications', feature: 'Notifications', method: 'GET', path: '/notifications', auth: 'jwt', permission: 'notifications.view' },
  { id: 'reports-sales', feature: 'Sales report', method: 'GET', path: '/reports/sales?range=week', auth: 'jwt', permission: 'reports.view' },
  { id: 'audit-logs', feature: 'Audit logs', method: 'GET', path: '/audit/logs?limit=5', auth: 'jwt', permission: 'audit.view' },
  { id: 'rbac-me', feature: 'RBAC profile', method: 'GET', path: '/rbac/me', auth: 'jwt', permission: 'dashboard.view' },

  { id: 'admin-monitor', feature: 'Admin payment monitor', method: 'GET', path: '/admin/payments/monitor', auth: 'jwt', permission: 'admin', roles: ['ADMIN'] },
  { id: 'admin-fraud-queue', feature: 'Admin fraud queue', method: 'GET', path: '/admin/payments/fraud-queue', auth: 'jwt', permission: 'admin', roles: ['ADMIN'] },
  { id: 'risk-analyze', feature: 'Risk analyze', method: 'POST', path: '/risk/analyze', auth: 'jwt', permission: 'payments.view', body: { amount: 100 } },
];
