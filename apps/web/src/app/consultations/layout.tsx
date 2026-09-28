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
 * `/consultations/:appointmentId` is shared by both roles — like
 * `/notifications`, it isn't nested under a single-role route group.
 * `RoleGuard` is given every role so any signed-in user may enter; the
 * consultation route itself (via `ConsultationsService`) enforces that the
 * caller is actually one of the appointment's two participants.
 */
export default function ConsultationsLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role={ANY_ROLE}>
      <ShellForCurrentUser>{children}</ShellForCurrentUser>
    </RoleGuard>
  );
}
