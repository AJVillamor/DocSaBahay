import type { Metadata } from 'next';

import { DashboardPlaceholder } from '@/features/auth/dashboard-placeholder';

export const metadata: Metadata = { title: 'Doctor dashboard' };

export default function DoctorDashboardPage() {
  return <DashboardPlaceholder title="Doctor dashboard" />;
}
