import type { Metadata } from 'next';

import { DashboardPlaceholder } from '@/features/auth/dashboard-placeholder';

export const metadata: Metadata = { title: 'Patient dashboard' };

export default function PatientDashboardPage() {
  return <DashboardPlaceholder title="Patient dashboard" />;
}
