import { Role } from '@doksabahay/shared';
import type { ReactNode } from 'react';

import { RoleGuard } from '@/features/auth/role-guard';

export default function DoctorLayout({ children }: { children: ReactNode }) {
  return <RoleGuard role={Role.DOCTOR}>{children}</RoleGuard>;
}
