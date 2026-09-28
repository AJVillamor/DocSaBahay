import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthHeroBand, AuthHeroPanel } from '@/features/auth/auth-hero-panel';
import { RegisterDoctorForm } from '@/features/auth/register-doctor-form';

export const metadata: Metadata = { title: 'Join as a doctor' };

const HEADLINE = 'Practice on your own schedule.';
const SUBTEXT =
  'Join DokSaBahay to see patients online, manage your availability, and write notes and prescriptions without the overhead.';
const FEATURES = [
  'Set your own weekly availability',
  'Consult patients from anywhere',
  'Verified once, then start seeing patients',
] as const;

export default function RegisterDoctorPage() {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <AuthHeroPanel headline={HEADLINE} subtext={SUBTEXT} features={FEATURES} />
      <main className="flex flex-1 flex-col">
        <AuthHeroBand headline={HEADLINE} />
        <div className="flex flex-1 items-start justify-center px-4 py-10">
          <div className="flex w-full max-w-lg flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-2xl font-bold tracking-tight">Join as a doctor</h2>
              <p className="text-sm text-muted-foreground">
                Offer online consultations. Use fictional details only.
              </p>
            </div>

            <RegisterDoctorForm />

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-info transition-colors hover:text-primary hover:underline"
              >
                Sign in
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
