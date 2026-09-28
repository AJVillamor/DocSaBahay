import type { Metadata } from 'next';

import { DoctorPatientDetailPage } from '@/features/records/doctor-patient-detail-page';

export const metadata: Metadata = { title: 'Patient records' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <DoctorPatientDetailPage patientId={id} />;
}
