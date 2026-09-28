'use client';

import {
  availabilityExceptionSchema,
  availabilityRuleSchema,
  type AvailabilityException,
  type AvailabilityRule,
  type CreateAvailabilityExceptionInput,
  type CreateAvailabilityRuleInput,
  type UpdateAvailabilityExceptionInput,
  type UpdateAvailabilityRuleInput,
} from '@doksabahay/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';

import { api, type ApiError } from '@/lib/api';

const rulesListSchema = z.array(availabilityRuleSchema);
const exceptionsListSchema = z.array(availabilityExceptionSchema);

export const rulesQueryKey = ['doctors', 'me', 'availability', 'rules'] as const;
export const exceptionsQueryKey = ['doctors', 'me', 'availability', 'exceptions'] as const;

/** The signed-in doctor's weekly availability rules. */
export function useAvailabilityRules() {
  return useQuery<AvailabilityRule[]>({
    queryKey: rulesQueryKey,
    queryFn: ({ signal }) => api.get('/doctors/me/availability/rules', rulesListSchema, signal),
  });
}

export function useCreateAvailabilityRule() {
  const queryClient = useQueryClient();
  return useMutation<AvailabilityRule, ApiError, CreateAvailabilityRuleInput>({
    mutationFn: (input) =>
      api.post('/doctors/me/availability/rules', input, availabilityRuleSchema),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: rulesQueryKey }),
  });
}

export function useUpdateAvailabilityRule() {
  const queryClient = useQueryClient();
  return useMutation<
    AvailabilityRule,
    ApiError,
    { id: string; input: UpdateAvailabilityRuleInput }
  >({
    mutationFn: ({ id, input }) =>
      api.patch(`/doctors/me/availability/rules/${id}`, input, availabilityRuleSchema),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: rulesQueryKey }),
  });
}

export function useDeleteAvailabilityRule() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(`/doctors/me/availability/rules/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: rulesQueryKey }),
  });
}

/** The signed-in doctor's availability exceptions (blocked time). */
export function useAvailabilityExceptions() {
  return useQuery<AvailabilityException[]>({
    queryKey: exceptionsQueryKey,
    queryFn: ({ signal }) =>
      api.get('/doctors/me/availability/exceptions', exceptionsListSchema, signal),
  });
}

export function useCreateAvailabilityException() {
  const queryClient = useQueryClient();
  return useMutation<AvailabilityException, ApiError, CreateAvailabilityExceptionInput>({
    mutationFn: (input) =>
      api.post('/doctors/me/availability/exceptions', input, availabilityExceptionSchema),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: exceptionsQueryKey }),
  });
}

export function useUpdateAvailabilityException() {
  const queryClient = useQueryClient();
  return useMutation<
    AvailabilityException,
    ApiError,
    { id: string; input: UpdateAvailabilityExceptionInput }
  >({
    mutationFn: ({ id, input }) =>
      api.patch(`/doctors/me/availability/exceptions/${id}`, input, availabilityExceptionSchema),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: exceptionsQueryKey }),
  });
}

export function useDeleteAvailabilityException() {
  const queryClient = useQueryClient();
  return useMutation<void, ApiError, string>({
    mutationFn: (id) => api.delete(`/doctors/me/availability/exceptions/${id}`),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: exceptionsQueryKey }),
  });
}
