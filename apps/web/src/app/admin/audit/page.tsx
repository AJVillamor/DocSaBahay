import type { Metadata } from 'next';

import { AdminAuditPage } from '@/features/admin/admin-audit-page';

export const metadata: Metadata = { title: 'Audit log' };

export default function Page() {
  return <AdminAuditPage />;
}
