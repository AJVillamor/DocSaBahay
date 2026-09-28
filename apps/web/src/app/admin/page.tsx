import type { Metadata } from 'next';

import { DashboardPlaceholder } from '@/features/auth/dashboard-placeholder';

export const metadata: Metadata = { title: 'Admin dashboard' };

export default function AdminDashboardPage() {
  return <DashboardPlaceholder title="Admin dashboard" />;
}
