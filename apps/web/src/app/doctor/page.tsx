import type { Metadata } from 'next';

import {
  DashboardPlaceholder,
  type DashboardCard,
} from '@/features/dashboard/dashboard-placeholder';

export const metadata: Metadata = { title: 'Doctor dashboard' };

const CARDS: DashboardCard[] = [
  { title: "Today's consultations", description: 'Patients booked with you today, in order.' },
  { title: 'Weekly availability', description: 'Set the hours patients can book with you.' },
  { title: 'Notes and prescriptions', description: 'Drafts waiting to be finalized.' },
];

export default function DoctorDashboardPage() {
  return <DashboardPlaceholder cards={CARDS} />;
}
