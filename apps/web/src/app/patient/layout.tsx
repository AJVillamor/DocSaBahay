import { Role } from '@doksabahay/shared';
import type { ReactNode } from 'react';

import { RoleGuard } from '@/features/auth/role-guard';

export default function PatientLayout({ children }: { children: ReactNode }) {
  return <RoleGuard role={Role.PATIENT}>{children}</RoleGuard>;
}
