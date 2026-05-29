/**
 * Verification harness configuration.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const RESULTS_DIR = path.join(ROOT, 'verification', 'results');
const SCREENSHOTS_DIR = path.join(ROOT, 'verification', 'screenshots');

const API_BASE = (process.env.VERIFY_API_BASE_URL || process.env.API_BASE_URL || 'http://127.0.0.1:3000').replace(
  /\/$/,
  ''
);

const TEST_USERS = {
  ADMIN: {
    username: process.env.TEST_ADMIN_USER || 'admin_test',
    password: process.env.TEST_ADMIN_PASS || 'TestAdmin!2026',
    role: 'ADMIN',
  },
  MANAGER: {
    username: process.env.TEST_MANAGER_USER || 'manager_test',
    password: process.env.TEST_MANAGER_PASS || 'TestManager!2026',
    role: 'MANAGER',
  },
  SALESPERSON: {
    username: process.env.TEST_SALES_USER || 'sales_test',
    password: process.env.TEST_SALES_PASS || 'TestSales!2026',
    role: 'SALESPERSON',
  },
  DELIVERY_AGENT: {
    username: process.env.TEST_DELIVERY_USER || 'delivery_test',
    password: process.env.TEST_DELIVERY_PASS || 'TestDelivery!2026',
    role: 'DELIVERY_AGENT',
  },
};

const REQUIRED_TABLES = [
  'users',
  'inventory',
  'customers',
  'sales',
  'deliveries',
  'roles',
  'permissions',
  'role_permissions',
  'audit_logs',
  'notifications',
  'stock_alerts',
  'payment_orders',
  'payment_transactions',
  'payment_webhooks',
  'suspicious_activities',
  'blocked_entities',
];

const RBAC_TABLES = ['roles', 'permissions', 'role_permissions'];

module.exports = {
  ROOT,
  RESULTS_DIR,
  SCREENSHOTS_DIR,
  API_BASE,
  TEST_USERS,
  REQUIRED_TABLES,
  RBAC_TABLES,
};
