import type { Metadata } from 'next';

import { DoctorPublicProfilePage } from '@/features/doctors/doctor-public-profile-page';

export const metadata: Metadata = { title: 'Doctor profile' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DoctorPublicProfilePage doctorId={id} />;
}
