'use client';

import {
  ErrorCode,
  meResponseSchema,
  type LoginInput,
  type MeResponse,
  type RegisterDoctorInput,
  type RegisterPatientInput,
} from '@doksabahay/shared';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { api, type ApiError } from '@/lib/api';

import { postSignInPath } from './redirects';
import { useAuth } from './use-auth';

export function useLogin() {
  return useMutation<MeResponse, ApiError, LoginInput>({
    mutationFn: (input) => api.post('/auth/login', input, meResponseSchema),
  });
}

export function useRegisterPatient() {
  return useMutation<MeResponse, ApiError, RegisterPatientInput>({
    mutationFn: (input) => api.post('/auth/register/patient', input, meResponseSchema),
  });
}

export function useRegisterDoctor() {
  return useMutation<MeResponse, ApiError, RegisterDoctorInput>({
    mutationFn: (input) => api.post('/auth/register/doctor', input, meResponseSchema),
  });
}

/**
 * Sends a signed-in visitor from /login or /register to where they belong.
 * Uses the same target as the post-sign-in navigation (including `next`),
 * because it also fires right after a successful sign-in caches the user.
 */
export function useRedirectIfSignedIn(next?: string | null): void {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (user) {
      router.replace(postSignInPath(user, next));
    }
  }, [user, next, router]);
}

/** User-facing text for an API error shown at the top of an auth form. */
export function authErrorMessage(error: ApiError): string {
  switch (error.code) {
    case ErrorCode.TOO_MANY_REQUESTS:
      return 'Too many sign-in attempts. Wait a minute, then try again.';
    case ErrorCode.ACCOUNT_INACTIVE:
      return `${error.message} Contact an administrator if you think this is a mistake.`;
    default:
      return error.message;
  }
}
