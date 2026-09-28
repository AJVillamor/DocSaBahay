'use client';

import {
  doctorProfileSchema,
  type DoctorProfile,
  type UpdateDoctorProfileInput,
} from '@doksabahay/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { authQueryKey } from '@/features/auth/use-auth';
import { api, type ApiError } from '@/lib/api';

export const doctorProfileQueryKey = ['doctors', 'me', 'profile'] as const;

/** The signed-in doctor's own profile. */
export function useDoctorProfile() {
  return useQuery<DoctorProfile>({
    queryKey: doctorProfileQueryKey,
    queryFn: ({ signal }) => api.get('/doctors/me/profile', doctorProfileSchema, signal),
  });
}

/**
 * Saves the signed-in doctor's profile. Also refetches `GET /auth/me`,
 * since a verification-status reset (on a specialization/license change)
 * changes what the auth banner shows.
 */
export function useUpdateDoctorProfile() {
  const queryClient = useQueryClient();
  return useMutation<DoctorProfile, ApiError, UpdateDoctorProfileInput>({
    mutationFn: (input) => api.put('/doctors/me/profile', input, doctorProfileSchema),
    onSuccess: (profile) => {
      queryClient.setQueryData(doctorProfileQueryKey, profile);
      void queryClient.invalidateQueries({ queryKey: authQueryKey });
    },
  });
}
