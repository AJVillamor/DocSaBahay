import type { Metadata } from 'next';

import { AdminAppointmentsPage } from '@/features/admin/admin-appointments-page';

export const metadata: Metadata = { title: 'Appointments' };

export default function Page() {
  return <AdminAppointmentsPage />;
}
