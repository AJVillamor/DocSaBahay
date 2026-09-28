import type { Metadata } from 'next';

import { DoctorProfilePage } from '@/features/doctors/doctor-profile-page';

export const metadata: Metadata = { title: 'Your profile' };

export default function Page() {
  return <DoctorProfilePage />;
}
