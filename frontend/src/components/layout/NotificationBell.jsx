import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as businessService from '../../services/businessService';

export default function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await businessService.fetchNotifications(true);
        if (!cancelled) setCount(data.unreadCount || 0);
      } catch {
        /* ignore */
      }
    })();
    const id = setInterval(() => {
      if (!cancelled) {
        businessService.fetchNotifications(true).then((d) => setCount(d.unreadCount || 0)).catch(() => {});
      }
    }, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <Link
      to="/notifications"
      className="relative flex h-10 w-10 items-center justify-center rounded-md text-lg hover:bg-white/5"
      title="Notifications"
    >
      🔔
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 text-[0.6rem] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
