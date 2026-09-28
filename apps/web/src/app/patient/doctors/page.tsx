import type { Metadata } from 'next';

import { DoctorDiscoveryPage } from '@/features/doctors/doctor-discovery-page';

export const metadata: Metadata = { title: 'Find a doctor' };

export default function Page() {
  return <DoctorDiscoveryPage />;
}
