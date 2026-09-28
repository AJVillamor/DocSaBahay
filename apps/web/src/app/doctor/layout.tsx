import { Role } from '@doksabahay/shared';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { RoleGuard } from '@/features/auth/role-guard';
import { VerificationBanner } from '@/features/doctor/verification-banner';

export default function DoctorLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role={Role.DOCTOR}>
      <AppShell role={Role.DOCTOR} banner={<VerificationBanner />}>
        {children}
      </AppShell>
    </RoleGuard>
  );
}
