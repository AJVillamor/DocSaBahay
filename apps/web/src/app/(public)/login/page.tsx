import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { PageLoading } from '@/components/page-state';
import { AuthHeroBand, AuthHeroPanel } from '@/features/auth/auth-hero-panel';
import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

const HEADLINE = 'Care that comes to you.';
const SUBTEXT =
  'Sign in to book consultations, message your doctor, and keep every note and prescription in one place.';
const FEATURES = [
  'Board-reviewed doctors',
  'Book in minutes, from anywhere',
  'Notes & prescriptions in one place',
] as const;

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col lg:flex-row">
      <AuthHeroPanel headline={HEADLINE} subtext={SUBTEXT} features={FEATURES} />
      <main className="flex flex-1 flex-col">
        <AuthHeroBand headline={HEADLINE} />
        <div className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
          <div className="flex w-full max-w-sm flex-col gap-6">
            <div className="flex flex-col gap-1.5">
              <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
              <p className="text-sm text-muted-foreground">Sign in to continue to your care.</p>
            </div>

            {/* useSearchParams (for ?next=) needs a Suspense boundary. */}
            <Suspense fallback={<PageLoading />}>
              <LoginForm />
            </Suspense>

            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">New here?</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Link
                href="/register/patient"
                className="flex h-11 items-center justify-center rounded-lg border border-input text-sm font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-secondary"
              >
                Register as a patient
              </Link>
              <p className="text-center text-sm text-muted-foreground">
                Are you a clinician?{' '}
                <Link
                  href="/register/doctor"
                  className="font-medium text-info transition-colors hover:text-primary hover:underline"
                >
                  Join as a doctor
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
