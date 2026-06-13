/** Role slugs aligned with backend roles table */
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  FINANCE: 'FINANCE',
  SUPPORT: 'SUPPORT',
  MERCHANT: 'MERCHANT',
  MANAGER: 'MANAGER',
  SUPERVISOR: 'MANAGER',
  SALESPERSON: 'SALESPERSON',
  DELIVERY: 'DELIVERY',
  DELIVERY_AGENT: 'DELIVERY',
  CUSTOMER: 'CUSTOMER',
};

const LEGACY = {
  admin: 'ADMIN',
  super_admin: 'SUPER_ADMIN',
  finance: 'FINANCE',
  support: 'SUPPORT',
  merchant: 'MERCHANT',
  manager: 'MANAGER',
  supervisor: 'MANAGER',
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
  if (u === 'SUPERVISOR') return 'MANAGER';
  if (ROLES[u]) return u;
  return LEGACY[String(role).toLowerCase()] || 'SALESPERSON';
}

export function isPrivilegedRole(role) {
  const normalized = normalizeRoleFromJwt(role);
  return normalized === 'ADMIN' || normalized === 'SUPER_ADMIN';
}

import {
  LayoutDashboard,
  Package,
  IndianRupee,
  Truck,
  Store,
  CreditCard,
  BarChart3,
  Bell,
  Users,
  ScrollText,
  ShieldCheck,
  AlertTriangle,
  Shield,
  Wallet,
  Factory,
  Landmark,
  Headphones,
} from 'lucide-react';

const PAYMENT_VIEW_PERMS = ['payments.view', 'payments.view.self', 'payments.view.all', 'payments.create'];

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Main', permission: 'dashboard.view' },
  { to: '/inventory', label: 'Inventory', icon: Package, section: 'Operations', permission: 'inventory.view' },
  { to: '/sales', label: 'Sales', icon: IndianRupee, permission: 'sales.view' },
  { to: '/deliveries', label: 'Deliveries', icon: Truck, permission: ['deliveries.view', 'deliveries.view_own'] },
  { to: '/customers', label: 'Customers', icon: Store, section: 'Accounts', permission: 'customers.view' },
  { to: '/payments', label: 'UPI Payments', icon: CreditCard, permission: PAYMENT_VIEW_PERMS },
  { to: '/collections', label: 'Collections', icon: Wallet, permission: ['collections.view', 'collections.manage'] },
  { to: '/suppliers', label: 'Suppliers', icon: Factory, permission: 'suppliers.view' },
  { to: '/security', label: 'Security', icon: Shield, permission: 'security.view' },
  { to: '/reports', label: 'Reports', icon: BarChart3, permission: 'reports.view' },
  { to: '/notifications', label: 'Alerts', icon: Bell, permission: ['notifications.view', 'payments.notifications'] },
];

export const ADMIN_NAV = [
  { to: '/users', label: 'User Management', icon: Users, section: 'Admin', permission: 'users.manage' },
  { to: '/admin/audit', label: 'Audit Logs', icon: ScrollText, permission: 'audit.view' },
  {
    to: '/admin/payments',
    label: 'Payment Monitor',
    icon: ShieldCheck,
    permission: ['payments.view', 'payments.view.all', 'webhook.view', 'ledger.view'],
  },
  { to: '/admin/fraud', label: 'Fraud Review', icon: AlertTriangle, roles: ['ADMIN', 'SUPER_ADMIN'] },
  { to: '/admin/risk', label: 'Risk Dashboard', icon: ShieldCheck, permission: 'security.admin' },
];

export const FINANCE_NAV = [
  { to: '/admin/payments', label: 'Settlements', icon: Landmark, section: 'Finance', permission: ['settlement.view', 'ledger.view'] },
  { to: '/collections', label: 'Collections', icon: Wallet, permission: ['collections.view', 'settlement.view'] },
];

export const SUPPORT_NAV = [
  { to: '/admin/payments', label: 'Payment Support', icon: Headphones, section: 'Support', permission: ['payments.view.all', 'notifications.view'] },
];

export const MERCHANT_NAV = [
  { to: '/payments', label: 'My Payments', icon: CreditCard, section: 'Merchant', permission: ['payments.view.self', 'settlement.view'] },
];

export const PORTAL_NAV = [
  { to: '/portal', label: 'My Portal', icon: Store, section: 'Customer', permission: 'portal.view' },
];

export function canAccess(permissions, role, item) {
  const normalized = normalizeRoleFromJwt(role);
  if (isPrivilegedRole(normalized)) return true;
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
  if (normalized === 'MERCHANT') {
    return [...filterNav(MERCHANT_NAV, permissions, role), ...filterNav(NAV_ITEMS, permissions, role)];
  }
  const main = filterNav(NAV_ITEMS, permissions, role);
  const roleSpecific =
    normalized === 'FINANCE'
      ? filterNav(FINANCE_NAV, permissions, role)
      : normalized === 'SUPPORT'
        ? filterNav(SUPPORT_NAV, permissions, role)
        : [];
  const admin = filterNav(ADMIN_NAV, permissions, role);
  const merged = [...main, ...roleSpecific, ...admin];
  const seen = new Set();
  return merged.filter((item) => {
    if (seen.has(item.to)) return false;
    seen.add(item.to);
    return true;
  });
}
