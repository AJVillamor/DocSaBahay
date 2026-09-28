'use client';

import {
  consultationNoteSchema,
  type ConsultationNote,
  type UpsertConsultationNoteInput,
} from '@doksabahay/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';

/** Shared prefix for one appointment's note query. */
const NOTE_KEY = ['consultations', 'note'] as const;

/** The appointment's current note (any status), or `null` if the doctor hasn't saved a draft yet. Doctor only. */
export function useConsultationNote(appointmentId: string) {
  return useQuery<ConsultationNote | null>({
    queryKey: [...NOTE_KEY, appointmentId] as const,
    queryFn: ({ signal }) =>
      api.get(`/consultations/${appointmentId}/note`, consultationNoteSchema.nullable(), signal),
  });
}

/** Upserts the appointment's note as DRAFT. Called on every debounced autosave tick. */
export function useUpsertNote() {
  const queryClient = useQueryClient();
  return useMutation<
    ConsultationNote,
    ApiError,
    { appointmentId: string; input: UpsertConsultationNoteInput }
  >({
    mutationFn: ({ appointmentId, input }) =>
      api.put(`/consultations/${appointmentId}/note`, input, consultationNoteSchema),
    onSuccess: (data, { appointmentId }) => {
      queryClient.setQueryData([...NOTE_KEY, appointmentId], data);
    },
  });
}

/** Finalizes the appointment's note. Only allowed once the session is COMPLETED and every required field is filled. */
export function useFinalizeNote() {
  const queryClient = useQueryClient();
  return useMutation<ConsultationNote, ApiError, string>({
    mutationFn: (appointmentId) =>
      api.post(`/consultations/${appointmentId}/note/finalize`, undefined, consultationNoteSchema),
    onSuccess: (data, appointmentId) => {
      queryClient.setQueryData([...NOTE_KEY, appointmentId], data);
    },
  });
}
