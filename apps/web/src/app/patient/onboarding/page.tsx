import type { Metadata } from 'next';

import { DashboardPlaceholder } from '@/features/auth/dashboard-placeholder';

export const metadata: Metadata = { title: 'Complete your profile' };

export default function PatientOnboardingPage() {
  return <DashboardPlaceholder title="Complete your profile" />;
}
