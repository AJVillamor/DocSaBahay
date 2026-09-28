import type { Metadata } from 'next';

import { BookingFlow } from '@/features/appointments/booking-flow';

export const metadata: Metadata = { title: 'Book an appointment' };

export default async function Page({ params }: { params: Promise<{ doctorId: string }> }) {
  const { doctorId } = await params;
  return <BookingFlow doctorId={doctorId} />;
}
