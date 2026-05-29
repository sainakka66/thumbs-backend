import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { filterNav, NAV_ITEMS } from '../../lib/rbac';

const mobileNav = [
  { to: '/dashboard', label: 'Home', icon: '🏠', permission: 'dashboard.view' },
  { to: '/sales', label: 'Sell', icon: '💰', permission: 'sales.view' },
  { to: '/customers', label: 'Shops', icon: '🏪', permission: 'customers.view' },
  { to: '/deliveries', label: 'Deliver', icon: '🚚', permission: ['deliveries.view', 'deliveries.view_own'] },
  { to: '/notifications', label: 'Alerts', icon: '🔔', permission: 'notifications.view' },
];

export default function BottomNav() {
  const { role, permissions } = useAuth();
  const items = filterNav(mobileNav, permissions, role);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[90] flex border-t border-border bg-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.65rem] font-medium ${
              isActive ? 'text-brand' : 'text-muted'
            }`
          }
        >
          <span className="text-lg">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}
    </nav>
  );
}
