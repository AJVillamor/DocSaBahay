import type { Metadata } from 'next';

import { DoctorSchedulePage } from '@/features/doctors/doctor-schedule-page';

export const metadata: Metadata = { title: 'Schedule' };

export default function Page() {
  return <DoctorSchedulePage />;
}
