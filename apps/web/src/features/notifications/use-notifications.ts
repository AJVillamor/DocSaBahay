'use client';

import {
  notificationSchema,
  paginatedNotificationsSchema,
  unreadCountSchema,
  type Notification,
  type PaginatedNotifications,
  type UnreadCount,
} from '@doksabahay/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';

import { useRealtimeConnected } from './realtime-provider';

/** Shared prefix: invalidated together whenever the socket hints a change, or a mutation succeeds. */
export const NOTIFICATIONS_KEY = ['notifications'] as const;
const LIST_KEY_PREFIX = [...NOTIFICATIONS_KEY, 'list'] as const;
const UNREAD_COUNT_KEY = [...NOTIFICATIONS_KEY, 'unread-count'] as const;

/** The caller's own notifications, newest first. */
export function useNotifications(params: { unreadOnly?: boolean; page: number }) {
  const query = params.unreadOnly ? `?page=${params.page}&unreadOnly=true` : `?page=${params.page}`;
  return useQuery<PaginatedNotifications>({
    queryKey: [...LIST_KEY_PREFIX, params.unreadOnly ?? false, params.page] as const,
    queryFn: ({ signal }) =>
      api.get(`/notifications${query}`, paginatedNotificationsSchema, signal),
  });
}

/**
 * Count of the caller's unread notifications, for the header bell badge.
 * Polls every 30s only while the notifications socket is disconnected — a
 * connected socket instead triggers an immediate refetch via
 * `NotificationsRealtimeProvider` invalidating this query.
 */
export function useUnreadCount() {
  const connected = useRealtimeConnected();
  return useQuery<UnreadCount>({
    queryKey: UNREAD_COUNT_KEY,
    queryFn: ({ signal }) => api.get('/notifications/unread-count', unreadCountSchema, signal),
    refetchInterval: connected ? false : 30_000,
  });
}

/** Optimistically marks one notification read in every cached list/badge before the request settles. */
function markOneReadInCache(queryClient: QueryClient, id: string): void {
  const readAt = new Date().toISOString();
  queryClient.setQueriesData<PaginatedNotifications>({ queryKey: LIST_KEY_PREFIX }, (data) => {
    if (!data) return data;
    let changed = false;
    const items = data.items.map((item) => {
      if (item.id === id && !item.readAt) {
        changed = true;
        return { ...item, readAt };
      }
      return item;
    });
    return changed ? { ...data, items } : data;
  });
  queryClient.setQueryData<UnreadCount>(UNREAD_COUNT_KEY, (data) =>
    data ? { count: Math.max(0, data.count - 1) } : data,
  );
}

/** Marks one of the caller's own notifications read (404 if it isn't theirs). */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation<Notification, ApiError, string>({
    mutationFn: (id) => api.patch(`/notifications/${id}/read`, undefined, notificationSchema),
    onMutate: (id) => markOneReadInCache(queryClient, id),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}

/** Marks every one of the caller's unread notifications read. */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, void>({
    mutationFn: () => api.post('/notifications/read-all'),
    onMutate: () => {
      const readAt = new Date().toISOString();
      queryClient.setQueriesData<PaginatedNotifications>({ queryKey: LIST_KEY_PREFIX }, (data) =>
        data
          ? { ...data, items: data.items.map((item) => (item.readAt ? item : { ...item, readAt })) }
          : data,
      );
      queryClient.setQueryData<UnreadCount>(UNREAD_COUNT_KEY, { count: 0 });
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
  });
}
