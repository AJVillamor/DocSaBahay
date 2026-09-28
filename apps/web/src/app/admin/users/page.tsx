import type { Metadata } from 'next';

import { AdminUsersPage } from '@/features/admin/admin-users-page';

export const metadata: Metadata = { title: 'Users' };

export default function Page() {
  return <AdminUsersPage />;
}
