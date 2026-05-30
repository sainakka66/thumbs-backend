import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import GlobalSearch from './GlobalSearch';
import NotificationBell from './NotificationBell';

const titles = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/sales': 'Sales Entry',
  '/deliveries': 'Delivery Tracking',
  '/customers': 'Customers',
};

export default function AppLayout() {
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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
        <header className="sticky top-0 z-50 flex min-h-14 items-center justify-between gap-2 border-b border-border bg-bg/85 px-4 py-2 backdrop-blur-md safe-top lg:px-7">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-lg text-text hover:bg-surface2 lg:hidden"
              onClick={toggleSidebar}
              aria-label="Open menu"
            >
              <Menu size={22} />
            </button>
            <h1 className="truncate font-head text-[clamp(1.05rem,4.5vw,1.4rem)] font-bold tracking-wide">
              {title}
            </h1>
          </div>
          <GlobalSearch />
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={toggleTheme}
              className="grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-surface2 hover:text-text"
              title={isDark ? 'Switch to light' : 'Switch to dark'}
              aria-label="Toggle theme"
            >
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <NotificationBell />
            <span className="mx-1 hidden text-xs text-muted md:inline" id="current-date">
              {new Date().toLocaleDateString('en-IN', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </span>
            <button
              type="button"
              onClick={logout}
              className="grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-surface2 hover:text-brand"
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-4 pb-24 md:px-7 md:py-7 lg:pb-7">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
