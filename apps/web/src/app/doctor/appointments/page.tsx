import type { Metadata } from 'next';

import { DoctorAppointmentsPage } from '@/features/appointments/doctor-appointments-page';

export const metadata: Metadata = { title: 'Appointments' };

export default function Page() {
  return <DoctorAppointmentsPage />;
}
