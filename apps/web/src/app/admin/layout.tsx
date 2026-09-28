import { Role } from '@doksabahay/shared';
import type { ReactNode } from 'react';

import { RoleGuard } from '@/features/auth/role-guard';

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <RoleGuard role={Role.ADMIN}>{children}</RoleGuard>;
}
