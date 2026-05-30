import { useQueryClient } from '@tanstack/react-query';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import { SkeletonCard } from '../components/ui/Skeleton';
import * as businessService from '../services/businessService';
import { useNotifications } from '../hooks/useDashboard';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useNotifications(false);
  const items = data?.items || [];

  function invalidate() {
    qc.invalidateQueries({ queryKey: ['notifications'] });
  }

  async function markAll() {
    await businessService.markAllNotificationsRead();
    invalidate();
  }

  async function markOne(id) {
    await businessService.markNotificationRead(id);
    invalidate();
  }

  return (
    <div className="page-container pb-20 lg:pb-0">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Notifications" subtitle="Low stock, deliveries, and business alerts" />
        <Button variant="secondary" onClick={markAll}>
          Mark all read
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      <ul className="space-y-2">
        {items.map((n) => (
          <li
            key={n.id}
            className={`rounded-lg border p-4 ${n.is_read ? 'border-border bg-surface/50' : 'border-brand/40 bg-brand/5'}`}
          >
            <div className="flex justify-between gap-2">
              <div>
                <div className="font-semibold">{n.title}</div>
                <p className="mt-1 text-sm text-muted">{n.message}</p>
                <p className="mt-2 text-xs text-muted">
                  {new Date(n.created_at).toLocaleString('en-IN')} · {n.type}
                </p>
              </div>
              {!n.is_read && (
                <button type="button" className="text-xs text-brand" onClick={() => markOne(n.id)}>
                  Mark read
                </button>
              )}
            </div>
          </li>
        ))}
        {!isLoading && !items.length && <p className="text-muted">No notifications yet.</p>}
      </ul>
    </div>
  );
}
