'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';

import { PageLoading } from '@/components/page-state';
import { useAuth } from '@/features/auth/use-auth';

const ONBOARDING_PATH = '/patient/onboarding';

/**
 * Standing guard for the `/patient/*` area: a signed-in patient whose
 * profile is not complete is sent to `/patient/onboarding` from any other
 * page, not just at sign-in. Render inside `RoleGuard`, which guarantees a
 * signed-in patient. UX only: the API enforces this itself.
 */
export function OnboardingGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const needsOnboarding = user?.profileCompleted === false && pathname !== ONBOARDING_PATH;

  useEffect(() => {
    if (needsOnboarding) {
      router.replace(ONBOARDING_PATH);
    }
  }, [needsOnboarding, router]);

  if (needsOnboarding) {
    return <PageLoading />;
  }
  return children;
}
