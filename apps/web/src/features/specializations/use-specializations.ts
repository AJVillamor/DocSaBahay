'use client';

import { specializationListSchema, type Specialization } from '@doksabahay/shared';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

/** All specializations from the public `GET /specializations`. They rarely change. */
export function useSpecializations() {
  return useQuery<Specialization[]>({
    queryKey: ['specializations'],
    queryFn: ({ signal }) => api.get('/specializations', specializationListSchema, signal),
    staleTime: 5 * 60_000,
  });
}
