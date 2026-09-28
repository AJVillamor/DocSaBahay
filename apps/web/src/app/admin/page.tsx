import type { Metadata } from 'next';

import {
  DashboardPlaceholder,
  type DashboardCard,
} from '@/features/dashboard/dashboard-placeholder';

export const metadata: Metadata = { title: 'Admin dashboard' };

const CARDS: DashboardCard[] = [
  { title: 'Doctor reviews', description: 'Pending doctor profiles waiting for approval.' },
  { title: 'Users', description: 'Suspend or reactivate patient and doctor accounts.' },
  { title: 'Audit log', description: 'Every administrative change, with who made it and when.' },
];

export default function AdminDashboardPage() {
  return <DashboardPlaceholder cards={CARDS} />;
}
