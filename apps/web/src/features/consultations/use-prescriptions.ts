'use client';

import {
  prescriptionListSchema,
  prescriptionSchema,
  type Prescription,
  type PrescriptionList,
  type UpsertPrescriptionInput,
} from '@doksabahay/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';

/** Shared prefix for one appointment's prescriptions query. */
const PRESCRIPTIONS_KEY = ['consultations', 'prescriptions'] as const;

function invalidate(queryClient: QueryClient, appointmentId: string) {
  return queryClient.invalidateQueries({ queryKey: [...PRESCRIPTIONS_KEY, appointmentId] });
}

/** Every prescription on the appointment (any status), oldest first. Doctor only. */
export function usePrescriptions(appointmentId: string) {
  return useQuery<PrescriptionList>({
    queryKey: [...PRESCRIPTIONS_KEY, appointmentId] as const,
    queryFn: ({ signal }) =>
      api.get(`/consultations/${appointmentId}/prescriptions`, prescriptionListSchema, signal),
  });
}

/** Upserts the appointment's current draft prescription (creating one if none exists), replacing its items wholesale. */
export function useUpsertPrescription() {
  const queryClient = useQueryClient();
  return useMutation<
    Prescription,
    ApiError,
    { appointmentId: string; input: UpsertPrescriptionInput }
  >({
    mutationFn: ({ appointmentId, input }) =>
      api.put(`/consultations/${appointmentId}/prescriptions`, input, prescriptionSchema),
    onSuccess: (_data, { appointmentId }) => void invalidate(queryClient, appointmentId),
  });
}

/** Issues a prescription (DRAFT → ISSUED), permanently read-only afterward. */
export function useIssuePrescription() {
  const queryClient = useQueryClient();
  return useMutation<Prescription, ApiError, { id: string; appointmentId: string }>({
    mutationFn: ({ id }) => api.post(`/prescriptions/${id}/issue`, undefined, prescriptionSchema),
    onSuccess: (_data, { appointmentId }) => void invalidate(queryClient, appointmentId),
  });
}
