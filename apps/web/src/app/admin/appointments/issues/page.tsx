import type { Metadata } from 'next';

import { AdminAppointmentIssuesPage } from '@/features/admin/admin-appointment-issues-page';

export const metadata: Metadata = { title: 'Appointment issues' };

export default function Page() {
  return <AdminAppointmentIssuesPage />;
}
