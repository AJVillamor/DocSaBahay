import type { Metadata } from 'next';

import { PatientRecordsPage } from '@/features/records/patient-records-page';

export const metadata: Metadata = { title: 'Records' };

export default function Page() {
  return <PatientRecordsPage />;
}
