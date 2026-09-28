'use client';

import type { Notification } from '@doksabahay/shared';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { NotificationItem } from './notification-item';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from './use-notifications';

/**
 * Header bell: unread-count badge, and a dropdown with the caller's latest
 * notifications (one page's worth — `GET /notifications` is already sized to
 * `NOTIFICATIONS_PAGE_SIZE`), a "Mark all read" action, and a link to the
 * full `/notifications` list.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const unreadCount = useUnreadCount();
  const list = useNotifications({ page: 1 });
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const count = unreadCount.data?.count ?? 0;
  const badgeLabel = count > 9 ? '9+' : String(count);

  function handleSelect(notification: Notification) {
    if (!notification.readAt) {
      markRead.mutate(notification.id);
    }
    setOpen(false);
    if (notification.link) {
      router.push(notification.link);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon" className="relative" />}
        aria-label={count > 0 ? `Notifications, ${count} unread` : 'Notifications'}
      >
        <Bell aria-hidden="true" />
        {count > 0 ? (
          <Badge
            variant="destructive"
            className="pointer-events-none absolute -top-1 -right-1 h-4 min-w-4 justify-center px-1 text-[10px]"
          >
            {badgeLabel}
          </Badge>
        ) : null}
      </PopoverTrigger>

      <PopoverContent className="flex flex-col p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Notifications</h2>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={count === 0 || markAllRead.isPending}
            onClick={() => markAllRead.mutate()}
          >
            Mark all read
          </Button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {list.isPending ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : null}
          {list.isError ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              Couldn&apos;t load notifications.
            </p>
          ) : null}
          {list.data && list.data.items.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">
              You&apos;re all caught up.
            </p>
          ) : null}
          {list.data?.items.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onSelect={handleSelect}
            />
          ))}
        </div>

        <div className="border-t px-4 py-2 text-center">
          <Link
            href="/notifications"
            className="text-sm text-primary hover:underline"
            onClick={() => setOpen(false)}
          >
            View all
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
