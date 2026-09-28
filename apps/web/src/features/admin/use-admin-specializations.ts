'use client';

import {
  specializationListSchema,
  specializationSchema,
  type CreateSpecializationInput,
  type Specialization,
  type UpdateSpecializationInput,
} from '@doksabahay/shared';
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';

const ADMIN_SPECIALIZATIONS_KEY = ['admin', 'specializations'] as const;

function invalidate(queryClient: QueryClient) {
  return queryClient.invalidateQueries({ queryKey: ADMIN_SPECIALIZATIONS_KEY });
}

/** Every specialization, for the `/admin/specializations` CRUD table. */
export function useAdminSpecializations() {
  return useQuery<Specialization[]>({
    queryKey: ADMIN_SPECIALIZATIONS_KEY,
    queryFn: ({ signal }) => api.get('/admin/specializations', specializationListSchema, signal),
  });
}

export function useCreateSpecialization() {
  const queryClient = useQueryClient();
  return useMutation<Specialization, ApiError, CreateSpecializationInput>({
    mutationFn: (input) => api.post('/admin/specializations', input, specializationSchema),
    onSuccess: () => void invalidate(queryClient),
  });
}

export function useUpdateSpecialization() {
  const queryClient = useQueryClient();
  return useMutation<Specialization, ApiError, { id: string; input: UpdateSpecializationInput }>({
    mutationFn: ({ id, input }) =>
      api.patch(`/admin/specializations/${id}`, input, specializationSchema),
    onSuccess: () => void invalidate(queryClient),
  });
}

/** @throws ApiError with `code: 'SPECIALIZATION_IN_USE'` (409) if it's still referenced anywhere. */
export function useDeleteSpecialization() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(`/admin/specializations/${id}`),
    onSuccess: () => void invalidate(queryClient),
  });
}
