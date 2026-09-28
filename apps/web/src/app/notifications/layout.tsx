'use client';

import { Role } from '@doksabahay/shared';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { RoleGuard } from '@/features/auth/role-guard';
import { useAuth } from '@/features/auth/use-auth';

const ANY_ROLE = [Role.PATIENT, Role.DOCTOR, Role.ADMIN];

/** `AppShell` needs the signed-in user's own role (for the right sidebar nav). */
function ShellForCurrentUser({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return null;
  }
  return <AppShell role={user.role}>{children}</AppShell>;
}

/**
 * `/notifications` is "my notifications" — identical behaviour for every
 * role — so, unlike `/patient`, `/doctor` and `/admin`, it isn't nested under
 * a single-role route group. `RoleGuard` is given every role so any signed-in
 * user may enter, and the shell below picks that user's own role for nav.
 */
export default function NotificationsLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role={ANY_ROLE}>
      <ShellForCurrentUser>{children}</ShellForCurrentUser>
    </RoleGuard>
  );
}
