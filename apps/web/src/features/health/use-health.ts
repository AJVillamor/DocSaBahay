import { healthResponseSchema, type HealthResponse } from '@doksabahay/shared';
import { useQuery } from '@tanstack/react-query';

import { apiGet } from '@/lib/api-client';

/** Polls `GET /health` so the status recovers on its own when the API or DB comes back. */
export function useHealth() {
  return useQuery<HealthResponse>({
    queryKey: ['health'],
    queryFn: () => apiGet('/health', healthResponseSchema),
    refetchInterval: 15_000,
    retry: 1,
  });
}
