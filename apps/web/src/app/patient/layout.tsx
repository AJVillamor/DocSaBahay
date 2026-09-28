import { Role } from '@doksabahay/shared';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { RoleGuard } from '@/features/auth/role-guard';

export default function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role={Role.PATIENT}>
      <AppShell role={Role.PATIENT}>{children}</AppShell>
    </RoleGuard>
  );
}
