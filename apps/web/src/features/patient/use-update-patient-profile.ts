'use client';

import {
  patientProfileResponseSchema,
  type MeResponse,
  type PatientProfile,
  type PatientProfileInput,
} from '@doksabahay/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { authQueryKey } from '@/features/auth/use-auth';
import { api, type ApiError } from '@/lib/api';

import { patientProfileQueryKey } from './use-patient-profile';

/**
 * Creates the caller's patient profile on the first call, updates it on
 * every later call (`PUT /patients/me/profile`). On success, patches both
 * the profile cache and the cached `/auth/me` user so guards and the app
 * shell see the new `profileCompleted`/name immediately, without a refetch.
 */
export function useUpdatePatientProfile() {
  const queryClient = useQueryClient();
  return useMutation<PatientProfile, ApiError, PatientProfileInput>({
    mutationFn: (input) => api.put('/patients/me/profile', input, patientProfileResponseSchema),
    onSuccess: (profile) => {
      queryClient.setQueryData(patientProfileQueryKey, profile);
      queryClient.setQueryData<MeResponse>(authQueryKey, (me) =>
        me
          ? {
              ...me,
              profile: { firstName: profile.firstName, lastName: profile.lastName },
              profileCompleted: profile.profileCompleted,
            }
          : me,
      );
    },
  });
}
