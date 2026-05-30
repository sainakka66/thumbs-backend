import { NavLink } from 'react-router-dom';
import { ThumbsUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { navForRole } from '../../lib/rbac';

export default function Sidebar({ open, onNavigate }) {
  const { role, permissions } = useAuth();
  const all = navForRole(permissions, role);
  let lastSection = '';

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-[100] flex w-[min(260px,88vw)] flex-col border-r border-border bg-surface transition-transform duration-200 ease-spring lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="border-b border-border px-5 py-5">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-sm">
            <ThumbsUp size={20} strokeWidth={2.4} />
          </span>
          <div>
            <div className="font-head text-xl font-extrabold leading-none tracking-wide text-text">
              Thumbs Up
            </div>
            <div className="mt-1 text-[0.62rem] uppercase tracking-[0.16em] text-muted">
              Distribution
            </div>
          </div>
        </div>
        {role && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            {role}
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {all.map((item) => {
          const showSection = item.section && item.section !== lastSection;
          if (item.section) lastSection = item.section;
          const Icon = item.icon;
          return (
            <div key={item.to}>
              {showSection && (
                <div className="px-3 pb-1 pt-4 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted">
                  {item.section}
                </div>
              )}
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-brand/10 text-brand'
                      : 'text-sub hover:bg-surface2 hover:text-text'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {Icon ? (
                      <Icon
                        size={18}
                        strokeWidth={isActive ? 2.4 : 2}
                        className="shrink-0"
                      />
                    ) : (
                      <span className="w-[18px]" />
                    )}
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-3 text-[0.7rem] text-muted">
        Enterprise distribution · RBAC enabled
      </div>
    </aside>
  );
}
