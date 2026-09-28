import type { Metadata } from 'next';

import { AdminSpecializationsPage } from '@/features/admin/admin-specializations-page';

export const metadata: Metadata = { title: 'Catalog' };

export default function Page() {
  return <AdminSpecializationsPage />;
}
