import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthHeroBand, AuthHeroPanel } from '@/features/auth/auth-hero-panel';
import { RegisterPatientForm } from '@/features/auth/register-patient-form';

export const metadata: Metadata = { title: 'Register as a patient' };

const HEADLINE = 'Get care without leaving home.';
const SUBTEXT =
  'Create an account to browse doctors, book consultations, and keep every note and prescription in one place.';
const FEATURES = [
  'Search doctors by specialization',
  'Book and reschedule online',
  'View notes & prescriptions anytime',
] as const;

export default function RegisterPatientPage() {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <AuthHeroPanel headline={HEADLINE} subtext={SUBTEXT} features={FEATURES} />
      <main className="flex flex-1 flex-col">
        <AuthHeroBand headline={HEADLINE} />
        <div className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
          <div className="flex w-full max-w-md flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-2xl font-bold tracking-tight">Register as a patient</h2>
              <p className="text-sm text-muted-foreground">
                Create an account to consult doctors from home. Use fictional details only.
              </p>
            </div>

            <RegisterPatientForm />

            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link
                href="/login"
                className="font-medium text-info transition-colors hover:text-primary hover:underline"
              >
                Sign in
              </Link>
              . Are you a doctor?{' '}
              <Link
                href="/register/doctor"
                className="font-medium text-info transition-colors hover:text-primary hover:underline"
              >
                Join as a doctor
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
