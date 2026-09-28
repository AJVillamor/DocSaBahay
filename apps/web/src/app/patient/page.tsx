import type { Metadata } from 'next';

import {
  DashboardPlaceholder,
  type DashboardCard,
} from '@/features/dashboard/dashboard-placeholder';

export const metadata: Metadata = { title: 'Patient dashboard' };

const CARDS: DashboardCard[] = [
  {
    title: 'Upcoming appointments',
    description: 'Your next consultations and how to join them.',
    href: '/patient/appointments',
  },
  {
    title: 'Find a doctor',
    description: 'Describe your symptoms and get matched with a specialist.',
    href: '/patient/find-care',
  },
  {
    title: 'Records',
    description: 'Consultation summaries and prescriptions from your doctors.',
    href: '/patient/records',
  },
];

export default function PatientDashboardPage() {
  return <DashboardPlaceholder cards={CARDS} />;
}
