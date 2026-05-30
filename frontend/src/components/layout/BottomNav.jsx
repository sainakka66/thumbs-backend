import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  IndianRupee,
  Store,
  Truck,
  MoreHorizontal,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { filterNav, NAV_ITEMS, ADMIN_NAV } from '../../lib/rbac';

const mobileNav = [
  { to: '/dashboard', label: 'Home', icon: Home, permission: 'dashboard.view' },
  { to: '/sales', label: 'Sell', icon: IndianRupee, permission: 'sales.view' },
  { to: '/customers', label: 'Shops', icon: Store, permission: 'customers.view' },
  { to: '/deliveries', label: 'Deliver', icon: Truck, permission: ['deliveries.view', 'deliveries.view_own'] },
];

export default function BottomNav() {
  const { role, permissions } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const items = filterNav(mobileNav, permissions, role);

  // Everything not already a primary tab goes into the "More" sheet.
  const primaryPaths = new Set(items.map((i) => i.to));
  const moreItems = filterNav([...NAV_ITEMS, ...ADMIN_NAV], permissions, role).filter(
    (i) => !primaryPaths.has(i.to)
  );

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-[90] flex border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2 text-[0.65rem] font-medium transition-colors ${
                  isActive ? 'text-brand' : 'text-muted'
                }`
              }
            >
              <Icon size={20} strokeWidth={2} />
              {item.label}
            </NavLink>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center gap-1 py-2 text-[0.65rem] font-medium text-muted"
        >
          <MoreHorizontal size={20} strokeWidth={2} />
          More
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-[110] lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] animate-slide-up">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-border" />
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-head text-lg font-bold">More</h2>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-lg text-muted hover:bg-surface2"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-1">
              {moreItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                        isActive ? 'bg-brand/10 text-brand' : 'text-sub hover:bg-surface2'
                      }`
                    }
                  >
                    {Icon && <Icon size={18} strokeWidth={2} />}
                    {item.label}
                  </NavLink>
                );
              })}
              {!moreItems.length && (
                <p className="px-3 py-4 text-sm text-muted">No additional sections.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
