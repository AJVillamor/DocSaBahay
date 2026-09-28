import type { Metadata } from 'next';
import { Suspense } from 'react';

import { PageLoading } from '@/components/page-state';
import { AdminDoctorsPage } from '@/features/admin/admin-doctors-page';

export const metadata: Metadata = { title: 'Doctor reviews' };

export default function Page() {
  // useSearchParams (for ?verificationStatus=, e.g. from the dashboard shortcut) needs a Suspense boundary.
  return (
    <Suspense fallback={<PageLoading label="Loading doctors…" />}>
      <AdminDoctorsPage />
    </Suspense>
  );
}
