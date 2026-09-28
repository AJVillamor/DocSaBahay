import type { Metadata } from 'next';

import { PatientAppointmentsPage } from '@/features/appointments/patient-appointments-page';

export const metadata: Metadata = { title: 'Appointments' };

export default function Page() {
  return <PatientAppointmentsPage />;
}
