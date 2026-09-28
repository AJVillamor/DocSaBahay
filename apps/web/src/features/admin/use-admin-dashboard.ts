'use client';

import { adminDashboardSchema, type AdminDashboard } from '@doksabahay/shared';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

const REFRESH_INTERVAL_MS = 60_000;

/** Operational summary for `/admin`: counts, the 14-day chart and recent audit entries. Refreshes every 60s. */
export function useAdminDashboard() {
  return useQuery<AdminDashboard>({
    queryKey: ['admin', 'dashboard'] as const,
    queryFn: ({ signal }) => api.get('/admin/dashboard', adminDashboardSchema, signal),
    refetchInterval: REFRESH_INTERVAL_MS,
  });
}
