import type { Metadata } from 'next';

import { DoctorPatientsPage } from '@/features/records/doctor-patients-page';

export const metadata: Metadata = { title: 'Patients' };

export default function Page() {
  return <DoctorPatientsPage />;
}
