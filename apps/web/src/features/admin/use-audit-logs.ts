'use client';

import { paginatedAuditLogsSchema, type PaginatedAuditLogs } from '@doksabahay/shared';
import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export interface AuditLogFilters {
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  from?: string;
  to?: string;
  page: number;
}

function toQueryString(filters: AuditLogFilters): string {
  const params = new URLSearchParams();
  if (filters.actorId) params.set('actorId', filters.actorId);
  if (filters.action) params.set('action', filters.action);
  if (filters.entityType) params.set('entityType', filters.entityType);
  if (filters.entityId) params.set('entityId', filters.entityId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  params.set('page', String(filters.page));
  return params.toString();
}

/** Filterable, paginated read of the append-only audit trail, for `/admin/audit`. */
export function useAuditLogs(filters: AuditLogFilters) {
  return useQuery<PaginatedAuditLogs>({
    queryKey: ['admin', 'audit-logs', filters] as const,
    queryFn: ({ signal }) =>
      api.get(`/admin/audit-logs?${toQueryString(filters)}`, paginatedAuditLogsSchema, signal),
  });
}
