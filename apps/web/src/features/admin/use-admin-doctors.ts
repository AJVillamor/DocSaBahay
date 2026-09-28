'use client';

import {
  adminDoctorDetailSchema,
  paginatedAdminDoctorsSchema,
  type AdminDoctorDetail,
  type PaginatedAdminDoctors,
  type ReviewDoctorInput,
  type UpdateDoctorProfileInput,
} from '@doksabahay/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';

export interface AdminDoctorsFilters {
  verificationStatus?: string;
  q?: string;
  page: number;
}

const ADMIN_DOCTORS_KEY = ['admin', 'doctors'] as const;

function toQueryString(filters: AdminDoctorsFilters): string {
  const params = new URLSearchParams();
  if (filters.verificationStatus) params.set('verificationStatus', filters.verificationStatus);
  if (filters.q) params.set('q', filters.q);
  params.set('page', String(filters.page));
  return params.toString();
}

function invalidateList(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: [...ADMIN_DOCTORS_KEY, 'list'] });
}

/** Searchable/filterable list of doctor profiles, for `/admin/doctors`. */
export function useAdminDoctors(filters: AdminDoctorsFilters) {
  return useQuery<PaginatedAdminDoctors>({
    queryKey: [...ADMIN_DOCTORS_KEY, 'list', filters] as const,
    queryFn: ({ signal }) =>
      api.get(`/admin/doctors?${toQueryString(filters)}`, paginatedAdminDoctorsSchema, signal),
  });
}

/** One doctor's admin-only detail, including `licenseNumber`. */
export function useAdminDoctor(id: string) {
  return useQuery<AdminDoctorDetail>({
    queryKey: [...ADMIN_DOCTORS_KEY, 'detail', id] as const,
    queryFn: ({ signal }) => api.get(`/admin/doctors/${id}`, adminDoctorDetailSchema, signal),
    enabled: Boolean(id),
  });
}

/** Approves or rejects a doctor's profile. */
export function useReviewDoctor() {
  const queryClient = useQueryClient();
  return useMutation<AdminDoctorDetail, ApiError, { id: string; input: ReviewDoctorInput }>({
    mutationFn: ({ id, input }) => api.post(`/admin/doctors/${id}/review`, input, adminDoctorDetailSchema),
    onSuccess: (doctor) => {
      queryClient.setQueryData([...ADMIN_DOCTORS_KEY, 'detail', doctor.id], doctor);
      void invalidateList(queryClient);
    },
  });
}

/** Admin's direct, authoritative edit of a doctor's profile and specializations. */
export function useUpdateAdminDoctorProfile() {
  const queryClient = useQueryClient();
  return useMutation<AdminDoctorDetail, ApiError, { id: string; input: UpdateDoctorProfileInput }>({
    mutationFn: ({ id, input }) => api.patch(`/admin/doctors/${id}`, input, adminDoctorDetailSchema),
    onSuccess: (doctor) => {
      queryClient.setQueryData([...ADMIN_DOCTORS_KEY, 'detail', doctor.id], doctor);
      void invalidateList(queryClient);
    },
  });
}
