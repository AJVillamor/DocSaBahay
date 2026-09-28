'use client';

import type { Role } from '@doksabahay/shared';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { PageError, PageLoading } from '@/components/page-state';

import { homePathFor } from './redirects';
import { useAuth } from './use-auth';

/**
 * Renders `children` only for a signed-in user whose role is `role` (or, if
 * `role` is an array, whose role is one of them — e.g. `/notifications`
 * works identically for every role). Signed-out users go to
 * `/login?next=…`; users with another role go to their own dashboard.
 * This is UX only: the API enforces every permission itself.
 */
export function RoleGuard({ role, children }: { role: Role | Role[]; children: ReactNode }) {
  const { status, user, error, refetch } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const allowedRoles = Array.isArray(role) ? role : [role];

  const redirectTo =
    status === 'unauthenticated'
      ? `/login?next=${encodeURIComponent(pathname)}`
      : user && !allowedRoles.includes(user.role)
        ? homePathFor(user)
        : null;

  useEffect(() => {
    if (redirectTo) {
      router.replace(redirectTo);
    }
  }, [redirectTo, router]);

  if (status === 'error') {
    return (
      <PageError message={error?.message ?? 'Could not load your account.'} onRetry={refetch} />
    );
  }
  if (status !== 'authenticated' || redirectTo) {
    return <PageLoading />;
  }
  return children;
}
