'use client';

import { doctorPatientListSchema, type DoctorPatientList } from '@doksabahay/shared';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

/** The signed-in doctor's patients (≥1 appointment together), optionally filtered by name. */
export function useDoctorPatients(search: string) {
  return useQuery<DoctorPatientList>({
    queryKey: ['doctor-patients', search] as const,
    queryFn: ({ signal }) =>
      api.get(
        `/doctors/me/patients${search ? `?search=${encodeURIComponent(search)}` : ''}`,
        doctorPatientListSchema,
        signal,
      ),
  });
}
