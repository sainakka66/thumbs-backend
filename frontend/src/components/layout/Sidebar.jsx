import { NavLink } from 'react-router-dom';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '📊', section: 'Main' },
  { to: '/inventory', label: 'Inventory', icon: '📦', section: 'Operations' },
  { to: '/sales', label: 'Sales Entry', icon: '💰', section: null },
  { to: '/deliveries', label: 'Deliveries', icon: '🚚', section: null },
  { to: '/customers', label: 'Customers', icon: '🏪', section: 'Accounts' },
];

export default function Sidebar({ open, onNavigate }) {
  let lastSection = '';

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-[100] flex w-[min(260px,88vw)] flex-col border-r border-border bg-surface transition-transform duration-200 lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="border-b border-border px-5 py-6">
        <div className="font-head text-2xl font-extrabold tracking-wide text-brand">
          👍 THUMBS<span className="font-normal text-text"> UP</span>
        </div>
        <div className="mt-0.5 text-[0.65rem] uppercase tracking-[0.14em] text-muted">
          Distribution System
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4">
        {nav.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;
          return (
            <div key={item.to}>
              {showSection && (
                <div className="px-5 pb-1 pt-3 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-muted">
                  {item.section}
                </div>
              )}
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `flex items-center gap-3 border-l-[3px] px-5 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'border-brand bg-brand/10 text-brand'
                      : 'border-transparent text-sub hover:bg-white/5 hover:text-text'
                  }`
                }
              >
                <span className="w-[18px] text-center">{item.icon}</span>
                {item.label}
              </NavLink>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border p-4 text-xs text-muted">
        Enterprise distribution UI
      </div>
    </aside>
  );
}
