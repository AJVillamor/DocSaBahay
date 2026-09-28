import type { Metadata } from 'next';

import { OnboardingForm } from '@/features/patient/onboarding-form';

export const metadata: Metadata = { title: 'Complete your profile' };

export default function PatientOnboardingPage() {
  return <OnboardingForm />;
}
