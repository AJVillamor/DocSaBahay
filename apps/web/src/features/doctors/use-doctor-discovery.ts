'use client';

import {
  doctorListResponseSchema,
  doctorPublicProfileSchema,
  type DoctorListResponse,
  type DoctorPublicProfile,
} from '@doksabahay/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

/** Default page size for `GET /doctors`. */
export const DOCTORS_PAGE_SIZE = 12;

export interface DoctorDiscoveryFilters {
  q?: string;
  specializationId?: string;
  language?: string;
  /** Only doctors whose next available slot falls within this many days (max 14). */
  availableWithinDays?: number;
  page: number;
}

function toQueryString(filters: DoctorDiscoveryFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.specializationId) params.set('specializationId', filters.specializationId);
  if (filters.language) params.set('language', filters.language);
  if (filters.availableWithinDays) {
    params.set('availableWithinDays', String(filters.availableWithinDays));
  }
  params.set('page', String(filters.page));
  params.set('pageSize', String(DOCTORS_PAGE_SIZE));
  return params.toString();
}

/** Searches bookable doctors with the given filters, keeping the previous page's data while a new page loads. */
export function useDoctorDiscovery(filters: DoctorDiscoveryFilters) {
  const query = toQueryString(filters);
  return useQuery<DoctorListResponse>({
    queryKey: ['doctors', 'discovery', query],
    queryFn: ({ signal }) => api.get(`/doctors?${query}`, doctorListResponseSchema, signal),
    placeholderData: keepPreviousData,
  });
}

/** A single doctor's public-ish profile (no license number). */
export function useDoctorPublicProfile(doctorId: string | undefined) {
  return useQuery<DoctorPublicProfile>({
    queryKey: ['doctors', doctorId, 'public-profile'],
    queryFn: ({ signal }) => api.get(`/doctors/${doctorId}`, doctorPublicProfileSchema, signal),
    enabled: Boolean(doctorId),
  });
}
