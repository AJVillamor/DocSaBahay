'use client';

import { REALTIME_NOTIFICATION_EVENT, realtimeTokenSchema } from '@doksabahay/shared';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';

import { useAuth } from '@/features/auth/use-auth';
import { api } from '@/lib/api';

import { NOTIFICATIONS_KEY } from './use-notifications';

/**
 * The browser connects directly to the API for the socket (not through the
 * same-origin `/api/*` rewrite that carries auth cookies): the socket
 * authenticates with its own short-lived token instead, so it does not need
 * the rewrite's cookie-forwarding. Falls back to `localhost:4000`, the
 * default for both `pnpm dev` and `docker compose up`.
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Realtime tokens are minted with a 60s TTL (see `RealtimeTokenService`).
 * Refreshing at less than that keeps a long-lived connection from ever
 * riding on an expired token.
 */
const TOKEN_REFRESH_INTERVAL_MS = 45_000;

const RealtimeContext = createContext(false);

/** Whether the notifications socket is currently connected. `false` while offline or reconnecting. */
export function useRealtimeConnected(): boolean {
  return useContext(RealtimeContext);
}

async function fetchRealtimeToken(): Promise<string> {
  const { token } = await api.get('/realtime/token', realtimeTokenSchema);
  return token;
}

/**
 * Owns the single notifications WebSocket connection for a signed-in
 * session. The socket only ever carries a change-hint (`{ id }`, via
 * `REALTIME_NOTIFICATION_EVENT`) — never notification content, per this
 * project's real-time rule — so the only thing this provider does on that
 * event is invalidate the `notifications` query cache; every consumer then
 * refetches over REST.
 *
 * Only mount this inside an authenticated area — `AppShell` does, so every
 * signed-in page gets one connection. Renders nothing itself.
 */
export function NotificationsRealtimeProvider({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  const userId = user?.id;
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    // No socket while signed out (or before auth resolves) — `connected` simply stays at
    // its default `false`; the cleanup below also resets it if a session ends mid-connection.
    if (status !== 'authenticated' || !userId) {
      return;
    }

    let cancelled = false;
    let socket: Socket | null = null;
    let refreshTimer: ReturnType<typeof setInterval> | null = null;

    const connect = async () => {
      try {
        tokenRef.current = await fetchRealtimeToken();
      } catch {
        // No usable session yet, or the API is unreachable: the header bell's own
        // polling of unread-count is the fallback. `connected` just stays false.
        return;
      }
      if (cancelled) {
        return;
      }

      socket = io(API_URL, {
        // A function (not a plain object) so every reconnection attempt — including
        // ones socket.io retries on its own after a network drop — picks up
        // whatever token is currently in `tokenRef`, not the one from first connect.
        auth: (callback) => callback({ token: tokenRef.current }),
        withCredentials: false,
      });

      socket.on('connect', () => setConnected(true));
      socket.on('disconnect', () => setConnected(false));
      socket.on('connect_error', () => setConnected(false));
      socket.on(REALTIME_NOTIFICATION_EVENT, () => {
        void queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });
      });

      // Re-authenticate the already-open connection well before its token expires,
      // rather than letting the token go stale or forcing a full reconnect.
      refreshTimer = setInterval(() => {
        void (async () => {
          try {
            const token = await fetchRealtimeToken();
            tokenRef.current = token;
            socket?.emit('reauth', token);
          } catch {
            // Keep the previous token; the next tick tries again, and a real
            // disconnect is handled by the `disconnect` handler above.
          }
        })();
      }, TOKEN_REFRESH_INTERVAL_MS);
    };

    void connect();

    return () => {
      cancelled = true;
      if (refreshTimer) {
        clearInterval(refreshTimer);
      }
      socket?.disconnect();
      setConnected(false);
    };
  }, [status, userId, queryClient]);

  return <RealtimeContext.Provider value={connected}>{children}</RealtimeContext.Provider>;
}
