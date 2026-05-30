import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import * as businessService from '../../services/businessService';
import { queryKeys } from '../../lib/queryClient';

export default function NotificationBell() {
  const { data } = useQuery({
    queryKey: queryKeys.notifications(true),
    queryFn: () => businessService.fetchNotifications(true),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const count = data?.unreadCount || 0;

  return (
    <Link
      to="/notifications"
      className="relative grid h-10 w-10 place-items-center rounded-lg text-muted hover:bg-surface2 hover:text-text"
      title="Notifications"
      aria-label={`Notifications${count > 0 ? `, ${count} unread` : ''}`}
    >
      <Bell size={18} />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand px-1 text-[0.6rem] font-bold text-white ring-2 ring-bg">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  );
}
