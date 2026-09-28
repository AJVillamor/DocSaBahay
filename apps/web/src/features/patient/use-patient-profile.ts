'use client';

import { patientProfileResponseSchema, type PatientProfile } from '@doksabahay/shared';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export const patientProfileQueryKey = ['patients', 'me', 'profile'] as const;

/** The caller's patient profile (`GET /patients/me/profile`). 404 means none saved yet. */
export function usePatientProfile() {
  return useQuery<PatientProfile>({
    queryKey: patientProfileQueryKey,
    queryFn: ({ signal }) => api.get('/patients/me/profile', patientProfileResponseSchema, signal),
  });
}
