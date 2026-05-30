import { Link } from 'react-router-dom';
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
