'use client';

import { ErrorCode, meResponseSchema, type MeResponse } from '@doksabahay/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { api, ApiError } from '@/lib/api';

import { postSignInPath } from './redirects';

export const authQueryKey = ['auth', 'me'] as const;

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

/** True when the API says there is no usable session (after the automatic refresh attempt). */
function isSignedOutError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    (error.statusCode === 401 || error.code === ErrorCode.ACCOUNT_INACTIVE)
  );
}

/**
 * The signed-in user from `GET /auth/me`. `error` covers only unexpected
 * failures (e.g. the API is down); a missing or expired session is `unauthenticated`.
 */
export function useAuth(): {
  status: AuthStatus;
  user: MeResponse | null;
  error: Error | null;
  refetch: () => void;
} {
  const query = useQuery({
    queryKey: authQueryKey,
    queryFn: ({ signal }) => api.get('/auth/me', meResponseSchema, signal),
    staleTime: 60_000,
    retry: (failureCount, error) => !isSignedOutError(error) && failureCount < 2,
  });

  const refetch = () => void query.refetch();
  if (query.isPending) {
    return { status: 'loading', user: null, error: null, refetch };
  }
  if (isSignedOutError(query.error)) {
    return { status: 'unauthenticated', user: null, error: null, refetch };
  }
  if (query.data) {
    return { status: 'authenticated', user: query.data, error: null, refetch };
  }
  return { status: 'error', user: null, error: query.error, refetch };
}

/**
 * Call after a successful login or registration: caches the returned user and
 * navigates to their dashboard (or a safe `next` path inside their area).
 */
export function useCompleteSignIn(): (user: MeResponse, next?: string | null) => void {
  const queryClient = useQueryClient();
  const router = useRouter();
  return (user, next) => {
    queryClient.setQueryData(authQueryKey, user);
    router.replace(postSignInPath(user, next));
  };
}

/** Signs out, drops all cached data and returns to the login page. */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      queryClient.clear();
      router.replace('/login');
    },
  });
}
