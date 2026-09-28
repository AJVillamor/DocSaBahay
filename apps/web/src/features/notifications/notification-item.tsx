'use client';

import type { Notification } from '@doksabahay/shared';
import { cn } from 'cn';
import { DateTime } from 'luxon';

/** Relative time in the browser's local timezone (e.g. "3 hours ago"), falling back to a date. */
function formatWhen(iso: string): string {
  const dt = DateTime.fromISO(iso);
  return dt.toRelative() ?? dt.toLocaleString(DateTime.DATETIME_MED);
}

/**
 * One notification row, shared by the header dropdown and the full
 * `/notifications` list. Selecting it marks it read (if unread) and, when
 * `notification.link` is set, navigates there — the caller (`NotificationBell`
 * or the notifications page) owns both effects via `onSelect`.
 */
export function NotificationItem({
  notification,
  onSelect,
}: {
  notification: Notification;
  onSelect: (notification: Notification) => void;
}) {
  const unread = !notification.readAt;
  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={cn(
        'flex w-full gap-3 border-b px-4 py-3 text-left last:border-b-0 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none',
        unread && 'bg-primary/5',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'mt-1.5 size-2 shrink-0 rounded-full',
          unread ? 'bg-primary' : 'bg-transparent',
        )}
      />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-baseline justify-between gap-2">
          <span className={cn('truncate text-sm', unread ? 'font-semibold' : 'font-medium')}>
            {notification.title}
            {unread ? <span className="sr-only"> (unread)</span> : null}
          </span>
          <span className="shrink-0 text-xs text-muted-foreground">
            {formatWhen(notification.createdAt)}
          </span>
        </span>
        <span className="line-clamp-2 text-sm text-muted-foreground">{notification.body}</span>
      </span>
    </button>
  );
}
