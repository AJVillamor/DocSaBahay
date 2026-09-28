'use client';

import { patientRecordsTimelineSchema, type PatientRecordsTimeline } from '@doksabahay/shared';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

/** The signed-in patient's own records timeline. */
export function usePatientRecords() {
  return useQuery<PatientRecordsTimeline>({
    queryKey: ['records', 'me'] as const,
    queryFn: ({ signal }) => api.get('/records/me', patientRecordsTimelineSchema, signal),
  });
}

/** One patient's records timeline, as seen by a treating doctor (404s server-side if they don't qualify). */
export function usePatientRecordsForDoctor(patientId: string | undefined) {
  return useQuery<PatientRecordsTimeline>({
    queryKey: ['records', 'patient', patientId] as const,
    queryFn: ({ signal }) =>
      api.get(`/patients/${patientId}/records`, patientRecordsTimelineSchema, signal),
    enabled: Boolean(patientId),
  });
}
