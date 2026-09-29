'use client';

import {
  CONSULTATION_POLL_INTERVAL_MS,
  consultationMessageSchema,
  type ConsultationMessage,
} from '@doksabahay/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { api, type ApiError } from '@/lib/api';

import { CONSULTATION_KEY } from './use-consultation';

/** Query key for one appointment's chat history — invalidated by `use-consultation-room.ts` on a socket message. */
export function consultationMessagesKey(appointmentId: string) {
  return [...CONSULTATION_KEY, 'messages', appointmentId] as const;
}

/**
 * Full chat history for one appointment, oldest first. Only enabled once the
 * consultation has started (`ConsultationChatPanel` passes `enabled` based on
 * session state) — the API 409s otherwise. Polls every
 * `CONSULTATION_POLL_INTERVAL_MS` as a fallback while the shared socket is
 * disconnected, matching `useConsultation`'s own fallback.
 */
export function useConsultationMessages(
  appointmentId: string,
  enabled: boolean,
  pollAsFallback: boolean,
) {
  return useQuery<ConsultationMessage[]>({
    queryKey: consultationMessagesKey(appointmentId),
    queryFn: ({ signal }) =>
      api.get(`/consultations/${appointmentId}/messages`, z.array(consultationMessageSchema), signal),
    enabled,
    refetchInterval: enabled && pollAsFallback ? CONSULTATION_POLL_INTERVAL_MS : false,
  });
}

/** Sends a chat message. Only allowed while the consultation is `IN_PROGRESS`. */
export function useSendConsultationMessage() {
  const queryClient = useQueryClient();
  return useMutation<ConsultationMessage, ApiError, { appointmentId: string; body: string }>({
    mutationFn: ({ appointmentId, body }) =>
      api.post(`/consultations/${appointmentId}/messages`, { body }, consultationMessageSchema),
    onSuccess: (message, { appointmentId }) => {
      void queryClient.invalidateQueries({ queryKey: consultationMessagesKey(appointmentId) });
    },
  });
}
