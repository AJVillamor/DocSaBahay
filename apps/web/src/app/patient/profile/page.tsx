import type { Metadata } from 'next';

import { PatientProfileView } from '@/features/patient/patient-profile-view';

export const metadata: Metadata = { title: 'My profile' };

export default function PatientProfilePage() {
  return <PatientProfileView />;
}
