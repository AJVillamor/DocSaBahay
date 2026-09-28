'use client';

import type { Notification } from '@doksabahay/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PageError, PageLoading } from '@/components/page-state';
import { Button } from '@/components/ui/button';

import { NotificationItem } from './notification-item';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from './use-notifications';

const FILTERS: { value: boolean; label: string }[] = [
  { value: false, label: 'All' },
  { value: true, label: 'Unread' },
];

/**
 * `/notifications`: the caller's full, paginated notification history.
 * Works identically for every role — it's just "my notifications" — so it
 * lives outside the patient/doctor/admin route groups (see
 * `apps/web/src/app/notifications/layout.tsx`).
 */
export function NotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const router = useRouter();
  const notifications = useNotifications({ unreadOnly, page });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  function handleSelect(notification: Notification) {
    if (!notification.readAt) {
      markRead.mutate(notification.id);
    }
    if (notification.link) {
      router.push(notification.link);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Updates about your appointments and account.</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={markAllRead.isPending}
          onClick={() => markAllRead.mutate()}
        >
          Mark all read
        </Button>
      </div>

      <div role="tablist" aria-label="Notification filter" className="flex gap-2">
        {FILTERS.map(({ value, label }) => (
          <Button
            key={label}
            type="button"
            role="tab"
            aria-selected={unreadOnly === value}
            variant={unreadOnly === value ? 'default' : 'outline'}
            onClick={() => {
              setUnreadOnly(value);
              setPage(1);
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      {notifications.isPending ? <PageLoading label="Loading notifications…" /> : null}
      {notifications.isError ? (
        <PageError
          message={notifications.error.message}
          onRetry={() => void notifications.refetch()}
        />
      ) : null}
      {notifications.data && notifications.data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {unreadOnly ? "You're all caught up." : 'No notifications yet.'}
        </p>
      ) : null}

      {notifications.data && notifications.data.items.length > 0 ? (
        <ul className="flex flex-col rounded-lg border">
          {notifications.data.items.map((notification) => (
            <li key={notification.id}>
              <NotificationItem notification={notification} onSelect={handleSelect} />
            </li>
          ))}
        </ul>
      ) : null}

      {notifications.data && notifications.data.totalCount > notifications.data.pageSize ? (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page * notifications.data.pageSize >= notifications.data.totalCount}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </div>
  );
}
