'use client';

import {
  CONSULTATION_POLL_INTERVAL_MS,
  consultationSessionSchema,
  type ConsultationSession,
} from '@doksabahay/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';

/** Shared prefix: invalidated together on a `consultation:state` socket event. */
export const CONSULTATION_KEY = ['consultations'] as const;

/**
 * The consultation workspace state for one appointment. Refetches on the
 * caller's own mutations (join/start/complete) via cache writes, on a
 * `consultation:state` socket event via cache invalidation (see
 * `use-consultation-room.ts`), and — only while that socket is disconnected —
 * by polling every `CONSULTATION_POLL_INTERVAL_MS` as a fallback.
 */
export function useConsultation(appointmentId: string, pollAsFallback: boolean) {
  return useQuery<ConsultationSession>({
    queryKey: [...CONSULTATION_KEY, appointmentId] as const,
    queryFn: ({ signal }) =>
      api.get(`/consultations/${appointmentId}`, consultationSessionSchema, signal),
    refetchInterval: pollAsFallback ? CONSULTATION_POLL_INTERVAL_MS : false,
  });
}

function useConsultationAction(action: 'join' | 'start' | 'complete' | 'no-show') {
  const queryClient = useQueryClient();
  return useMutation<ConsultationSession, ApiError, string>({
    mutationFn: (appointmentId) =>
      api.post(`/consultations/${appointmentId}/${action}`, undefined, consultationSessionSchema),
    onSuccess: (data, appointmentId) => {
      queryClient.setQueryData([...CONSULTATION_KEY, appointmentId], data);
    },
  });
}

/** First participant to call this moves the session to JOINED; idempotent after that. */
export function useJoinConsultation() {
  return useConsultationAction('join');
}

/** Doctor only. Requires both participants already joined. */
export function useStartConsultation() {
  return useConsultationAction('start');
}

/** Doctor only. Also marks the appointment COMPLETED. */
export function useCompleteConsultation() {
  return useConsultationAction('complete');
}

/** Doctor only. Cancels the appointment with reason "Patient did not attend." */
export function useReportNoShow() {
  return useConsultationAction('no-show');
}
