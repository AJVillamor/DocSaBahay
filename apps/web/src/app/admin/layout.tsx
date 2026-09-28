import { Role } from '@doksabahay/shared';
import type { ReactNode } from 'react';

import { AppShell } from '@/components/app-shell/app-shell';
import { RoleGuard } from '@/features/auth/role-guard';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleGuard role={Role.ADMIN}>
      <AppShell role={Role.ADMIN}>{children}</AppShell>
    </RoleGuard>
  );
}
