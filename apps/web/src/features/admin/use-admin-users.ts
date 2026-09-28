'use client';

import {
  adminUserDetailSchema,
  paginatedAdminUsersSchema,
  type AdminUserDetail,
  type PaginatedAdminUsers,
  type UpdateUserStatusInput,
} from '@doksabahay/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';

export interface AdminUsersFilters {
  q?: string;
  role?: string;
  status?: string;
  page: number;
}

const ADMIN_USERS_KEY = ['admin', 'users'] as const;

function toQueryString(filters: AdminUsersFilters): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.role) params.set('role', filters.role);
  if (filters.status) params.set('status', filters.status);
  params.set('page', String(filters.page));
  return params.toString();
}

/** Searchable/filterable list of every user, for `/admin/users`. */
export function useAdminUsers(filters: AdminUsersFilters) {
  return useQuery<PaginatedAdminUsers>({
    queryKey: [...ADMIN_USERS_KEY, 'list', filters] as const,
    queryFn: ({ signal }) =>
      api.get(`/admin/users?${toQueryString(filters)}`, paginatedAdminUsersSchema, signal),
  });
}

/** One user's detail, including their `upcomingAppointmentCount`. */
export function useAdminUser(id: string) {
  return useQuery<AdminUserDetail>({
    queryKey: [...ADMIN_USERS_KEY, 'detail', id] as const,
    queryFn: ({ signal }) => api.get(`/admin/users/${id}`, adminUserDetailSchema, signal),
    enabled: Boolean(id),
  });
}

/** Suspends, deactivates or reactivates a user. Cascades to their future appointments on the API side. */
export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation<AdminUserDetail, ApiError, { id: string; input: UpdateUserStatusInput }>({
    mutationFn: ({ id, input }) => api.patch(`/admin/users/${id}/status`, input, adminUserDetailSchema),
    onSuccess: (user) => {
      queryClient.setQueryData([...ADMIN_USERS_KEY, 'detail', user.id], user);
      void queryClient.invalidateQueries({ queryKey: [...ADMIN_USERS_KEY, 'list'] });
    },
  });
}
