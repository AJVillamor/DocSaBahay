import type { Metadata } from 'next';

import { AdminDoctorDetailPage } from '@/features/admin/admin-doctor-detail-page';

export const metadata: Metadata = { title: 'Doctor detail' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AdminDoctorDetailPage doctorId={id} />;
}
