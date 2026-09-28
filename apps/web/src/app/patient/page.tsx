import type { Metadata } from 'next';

import {
  DashboardPlaceholder,
  type DashboardCard,
} from '@/features/dashboard/dashboard-placeholder';

export const metadata: Metadata = { title: 'Patient dashboard' };

const CARDS: DashboardCard[] = [
  { title: 'Upcoming appointments', description: 'Your next consultations and how to join them.' },
  {
    title: 'Find a doctor',
    description: 'Describe your symptoms and get matched with a specialist.',
  },
  { title: 'Records', description: 'Consultation summaries and prescriptions from your doctors.' },
];

export default function PatientDashboardPage() {
  return <DashboardPlaceholder cards={CARDS} />;
}
