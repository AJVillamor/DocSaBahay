import type { Metadata } from 'next';

import { FindCarePage } from '@/features/matching/find-care-page';

export const metadata: Metadata = { title: 'Find care' };

export default function Page() {
  return <FindCarePage />;
}
