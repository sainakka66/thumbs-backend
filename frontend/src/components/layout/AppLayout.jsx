import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';

const titles = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/sales': 'Sales Entry',
  '/deliveries': 'Delivery Tracking',
  '/customers': 'Customers',
};

export default function AppLayout() {
  const { logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const title = titles[location.pathname] || 'Thumbs Up';

  useEffect(() => {
    setSidebarOpen(false);
    document.body.classList.remove('sidebar-open');
  }, [location.pathname]);

  const closeSidebar = () => {
    setSidebarOpen(false);
    document.body.classList.remove('sidebar-open');
  };

  const toggleSidebar = () => {
    setSidebarOpen((o) => {
      const next = !o;
      document.body.classList.toggle('sidebar-open', next);
      return next;
    });
  };

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[99] bg-black/55 lg:hidden"
          aria-label="Close menu"
          onClick={closeSidebar}
        />
      )}

      <Sidebar open={sidebarOpen} onNavigate={closeSidebar} />

      <div className="flex min-h-screen min-w-0 flex-col lg:ml-[240px]">
        <header className="sticky top-0 z-50 flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-border bg-ink/90 px-4 py-2 backdrop-blur-md safe-top lg:px-7">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-md text-xl lg:hidden"
              onClick={toggleSidebar}
              aria-label="Open menu"
            >
              ☰
            </button>
            <h1 className="truncate font-head text-[clamp(1.05rem,4.5vw,1.5rem)] font-bold tracking-wide">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-muted xs:inline" id="current-date">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </span>
            <button
              type="button"
              onClick={logout}
              className="rounded-md px-2 py-2 text-lg text-muted hover:text-brand"
              title="Sign out"
            >
              ⎋
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 md:px-7 md:py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
