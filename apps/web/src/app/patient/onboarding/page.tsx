import type { Metadata } from 'next';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';

export const metadata: Metadata = { title: 'Complete your profile' };

export default function PatientOnboardingPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Complete your profile</h1>
      <p className="text-muted-foreground">
        Before your first consultation, your doctor needs a few details: date of birth, height,
        weight, contact information and your medical history. The profile form is coming soon.
      </p>
      <div>
        <Link href="/patient" className={buttonVariants({ variant: 'outline' })}>
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
