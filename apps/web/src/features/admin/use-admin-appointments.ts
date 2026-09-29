'use client';

import {
  adminAppointmentDetailSchema,
  adminAppointmentIssuesResponseSchema,
  adminAppointmentSummarySchema,
  paginatedAdminAppointmentsSchema,
  type AdminAppointmentActionInput,
  type AdminAppointmentDetail,
  type AdminAppointmentIssuesResponse,
  type AdminAppointmentSummary,
  type AdminSetAppointmentDateTimeInput,
  type PaginatedAdminAppointments,
} from '@doksabahay/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';

export interface AdminAppointmentsFilters {
  status?: string;
  sessionState?: string;
  doctorId?: string;
  patientId?: string;
  from?: string;
  to?: string;
  page: number;
}

const ADMIN_APPOINTMENTS_KEY = ['admin', 'appointments'] as const;

function toQueryString(filters: AdminAppointmentsFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.sessionState) params.set('sessionState', filters.sessionState);
  if (filters.doctorId) params.set('doctorId', filters.doctorId);
  if (filters.patientId) params.set('patientId', filters.patientId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  params.set('page', String(filters.page));
  return params.toString();
}

/** Filterable, paginated list of every appointment, for `/admin/appointments`. */
export function useAdminAppointments(filters: AdminAppointmentsFilters) {
  return useQuery<PaginatedAdminAppointments>({
    queryKey: [...ADMIN_APPOINTMENTS_KEY, 'list', filters] as const,
    queryFn: ({ signal }) =>
      api.get(`/admin/appointments?${toQueryString(filters)}`, paginatedAdminAppointmentsSchema, signal),
  });
}

/** One appointment's metadata, session state and full event timeline. */
export function useAdminAppointment(id: string | undefined) {
  return useQuery<AdminAppointmentDetail>({
    queryKey: [...ADMIN_APPOINTMENTS_KEY, 'detail', id] as const,
    queryFn: ({ signal }) => api.get(`/admin/appointments/${id}`, adminAppointmentDetailSchema, signal),
    enabled: Boolean(id),
  });
}

/** SCHEDULED appointments currently flagged by one of the four issue detectors. */
export function useAdminAppointmentIssues() {
  return useQuery<AdminAppointmentIssuesResponse>({
    queryKey: [...ADMIN_APPOINTMENTS_KEY, 'issues'] as const,
    queryFn: ({ signal }) => api.get('/admin/appointments/issues', adminAppointmentIssuesResponseSchema, signal),
  });
}

function invalidateAdminAppointments(queryClient: ReturnType<typeof useQueryClient>) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ADMIN_APPOINTMENTS_KEY }),
    queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
  ]);
}

/** Force-cancels a SCHEDULED appointment. Notifies both participants. */
export function useCancelAdminAppointment() {
  const queryClient = useQueryClient();
  return useMutation<AdminAppointmentSummary, ApiError, { id: string; input: AdminAppointmentActionInput }>({
    mutationFn: ({ id, input }) =>
      api.post(`/admin/appointments/${id}/cancel`, input, adminAppointmentSummarySchema),
    onSuccess: () => void invalidateAdminAppointments(queryClient),
  });
}

/** Force-invalidates a SCHEDULED appointment (status INVALIDATED). Notifies both participants. */
export function useInvalidateAdminAppointment() {
  const queryClient = useQueryClient();
  return useMutation<AdminAppointmentSummary, ApiError, { id: string; input: AdminAppointmentActionInput }>({
    mutationFn: ({ id, input }) =>
      api.post(`/admin/appointments/${id}/invalidate`, input, adminAppointmentSummarySchema),
    onSuccess: () => void invalidateAdminAppointments(queryClient),
  });
}

/**
 * Demo/admin tool: moves an appointment to any date and time, bypassing
 * every normal booking rule. No participant is notified.
 */
export function useSetAdminAppointmentDateTime() {
  const queryClient = useQueryClient();
  return useMutation<
    AdminAppointmentSummary,
    ApiError,
    { id: string; input: AdminSetAppointmentDateTimeInput }
  >({
    mutationFn: ({ id, input }) =>
      api.patch(`/admin/appointments/${id}/datetime`, input, adminAppointmentSummarySchema),
    onSuccess: () => void invalidateAdminAppointments(queryClient),
  });
}
