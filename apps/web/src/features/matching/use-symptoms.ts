'use client';

import { symptomsByCategorySchema, type SymptomsByCategory } from '@doksabahay/shared';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

/** All symptoms, grouped by category. Rarely changes. */
export function useSymptoms() {
  return useQuery<SymptomsByCategory>({
    queryKey: ['matching', 'symptoms'],
    queryFn: ({ signal }) => api.get('/matching/symptoms', symptomsByCategorySchema, signal),
    staleTime: 5 * 60_000,
  });
}
