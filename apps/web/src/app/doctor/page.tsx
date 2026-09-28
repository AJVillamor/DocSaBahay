import type { Metadata } from 'next';

import {
  DashboardPlaceholder,
  type DashboardCard,
} from '@/features/dashboard/dashboard-placeholder';

export const metadata: Metadata = { title: 'Doctor dashboard' };

const CARDS: DashboardCard[] = [
  {
    title: "Today's consultations",
    description: 'Patients booked with you today, in order.',
    href: '/doctor/appointments',
  },
  {
    title: 'Weekly availability',
    description: 'Set the hours patients can book with you.',
    href: '/doctor/schedule',
  },
  {
    title: 'Notes and prescriptions',
    description: 'Drafts waiting to be finalized. Open a consultation to write one.',
    href: '/doctor/appointments',
  },
];

export default function DoctorDashboardPage() {
  return <DashboardPlaceholder cards={CARDS} />;
}
