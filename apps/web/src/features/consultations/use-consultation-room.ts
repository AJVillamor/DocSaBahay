'use client';

import {
  CONSULTATION_MESSAGE_EVENT,
  CONSULTATION_PRESENCE_EVENT,
  CONSULTATION_STATE_EVENT,
  type ConsultationMessageEvent,
  type ConsultationPresenceEvent,
} from '@doksabahay/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useRealtimeConnected, useRealtimeSocket } from '@/features/notifications/realtime-provider';

import { CONSULTATION_KEY } from './use-consultation';
import { consultationMessagesKey } from './use-consultation-messages';

/** Presence dots: participant user id → whether their socket is currently in the room. */
export type Presence = Record<string, boolean>;

/**
 * Joins socket room `consultation:{appointmentId}` on the shared notifications
 * socket (see `NotificationsRealtimeProvider`/`useRealtimeSocket`) rather than
 * opening a second connection. On `consultation:state`, invalidates the
 * consultation query so `useConsultation` refetches over REST — this hook
 * never trusts the pushed payload directly, per this project's real-time
 * rule. On `consultation:presence`, updates the local presence map. On
 * `consultation:message`, invalidates the chat query so
 * `useConsultationMessages` refetches.
 *
 * `connected` mirrors the shared socket's connection state, so the caller can
 * fall back to polling `useConsultation`/`useConsultationMessages` while it's `false`.
 */
export function useConsultationRoom(appointmentId: string | undefined): {
  connected: boolean;
  presence: Presence;
} {
  const socket = useRealtimeSocket();
  const connected = useRealtimeConnected();
  const queryClient = useQueryClient();
  const [presence, setPresence] = useState<Presence>({});

  useEffect(() => {
    if (!socket || !connected || !appointmentId) {
      return;
    }

    let cancelled = false;

    socket.emit(
      'consultation:join',
      appointmentId,
      (ack: { ok: boolean; onlineUserIds?: string[] }) => {
        if (cancelled || !ack?.ok || !ack.onlineUserIds) {
          return;
        }
        setPresence((prev) => {
          const next = { ...prev };
          for (const userId of ack.onlineUserIds ?? []) {
            next[userId] = true;
          }
          return next;
        });
      },
    );

    const onState = (event: { appointmentId: string }) => {
      if (event.appointmentId === appointmentId) {
        void queryClient.invalidateQueries({ queryKey: [...CONSULTATION_KEY, appointmentId] });
      }
    };
    const onPresence = (event: ConsultationPresenceEvent) => {
      if (event.appointmentId === appointmentId) {
        setPresence((prev) => ({ ...prev, [event.userId]: event.online }));
      }
    };
    const onMessage = (event: ConsultationMessageEvent) => {
      if (event.appointmentId === appointmentId) {
        void queryClient.invalidateQueries({ queryKey: consultationMessagesKey(appointmentId) });
      }
    };

    socket.on(CONSULTATION_STATE_EVENT, onState);
    socket.on(CONSULTATION_PRESENCE_EVENT, onPresence);
    socket.on(CONSULTATION_MESSAGE_EVENT, onMessage);

    return () => {
      cancelled = true;
      socket.off(CONSULTATION_STATE_EVENT, onState);
      socket.off(CONSULTATION_PRESENCE_EVENT, onPresence);
      socket.off(CONSULTATION_MESSAGE_EVENT, onMessage);
    };
  }, [socket, connected, appointmentId, queryClient]);

  return { connected, presence };
}
