import type { Metadata } from 'next';

import { ConsultationWorkspacePage } from '@/features/consultations/consultation-workspace-page';

export const metadata: Metadata = { title: 'Consultation' };

export default async function Page({ params }: { params: Promise<{ appointmentId: string }> }) {
  const { appointmentId } = await params;
  return <ConsultationWorkspacePage appointmentId={appointmentId} />;
}
