import { useEffect, useState } from 'react';
import PageHeader from '../components/ui/PageHeader';
import Button from '../components/ui/Button';
import * as businessService from '../services/businessService';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);

  async function load() {
    const data = await businessService.fetchNotifications();
    setItems(data.items || []);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function markAll() {
    await businessService.markAllNotificationsRead();
    load();
  }

  async function markOne(id) {
    await businessService.markNotificationRead(id);
    load();
  }

  return (
    <div className="page-container pb-20 lg:pb-0">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <PageHeader title="Notifications" subtitle="Low stock, deliveries, and business alerts" />
        <Button variant="secondary" onClick={markAll}>
          Mark all read
        </Button>
      </div>

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
        {!items.length && <p className="text-muted">No notifications yet.</p>}
      </ul>
    </div>
  );
}
