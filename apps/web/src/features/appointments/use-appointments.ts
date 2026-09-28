'use client';

import {
  appointmentSchema,
  paginatedAppointmentsSchema,
  type Appointment,
  type CancelAppointmentInput,
  type CreateAppointmentInput,
  type PaginatedAppointments,
  type RescheduleAppointmentInput,
} from '@doksabahay/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';

export type AppointmentScope = 'upcoming' | 'past';

/** Shared prefix: invalidated together whenever any appointment mutation succeeds. */
const APPOINTMENTS_KEY = ['appointments'] as const;

/** The caller's own appointments (patients see theirs, doctors see theirs — enforced by the API). */
export function useAppointments(scope: AppointmentScope, page: number) {
  return useQuery<PaginatedAppointments>({
    queryKey: [...APPOINTMENTS_KEY, 'list', scope, page] as const,
    queryFn: ({ signal }) =>
      api.get(`/appointments?scope=${scope}&page=${page}`, paginatedAppointmentsSchema, signal),
  });
}

/** One appointment. Only its two participants can load it (404 for anyone else). */
export function useAppointment(id: string | undefined) {
  return useQuery<Appointment>({
    queryKey: [...APPOINTMENTS_KEY, 'detail', id] as const,
    queryFn: ({ signal }) => api.get(`/appointments/${id}`, appointmentSchema, signal),
    enabled: Boolean(id),
  });
}

function invalidateAppointments(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: APPOINTMENTS_KEY });
}

/** Books a new appointment. See `AppointmentsService.create` on the API for the enforced rules. */
export function useCreateAppointment() {
  const queryClient = useQueryClient();
  return useMutation<Appointment, ApiError, CreateAppointmentInput>({
    mutationFn: (input) => api.post('/appointments', input, appointmentSchema),
    onSuccess: () => void invalidateAppointments(queryClient),
  });
}

/** Reschedules an appointment the signed-in patient owns. */
export function useRescheduleAppointment() {
  const queryClient = useQueryClient();
  return useMutation<Appointment, ApiError, { id: string; input: RescheduleAppointmentInput }>({
    mutationFn: ({ id, input }) =>
      api.patch(`/appointments/${id}/reschedule`, input, appointmentSchema),
    onSuccess: () => void invalidateAppointments(queryClient),
  });
}

/** Cancels an appointment (patient owner or doctor owner). */
export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation<Appointment, ApiError, { id: string; input: CancelAppointmentInput }>({
    mutationFn: ({ id, input }) => api.post(`/appointments/${id}/cancel`, input, appointmentSchema),
    onSuccess: () => void invalidateAppointments(queryClient),
  });
}
