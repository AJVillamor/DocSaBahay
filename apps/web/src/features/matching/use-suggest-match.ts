'use client';

import {
  suggestMatchResponseSchema,
  type SuggestMatchInput,
  type SuggestMatchResponse,
} from '@doksabahay/shared';
import { useMutation } from '@tanstack/react-query';

import { api, type ApiError } from '@/lib/api';

/** Submits selected symptoms/description and returns ranked specialization + doctor suggestions. */
export function useSuggestMatch() {
  return useMutation<SuggestMatchResponse, ApiError, SuggestMatchInput>({
    mutationFn: (input) => api.post('/matching/suggest', input, suggestMatchResponseSchema),
  });
}
