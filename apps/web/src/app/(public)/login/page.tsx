import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { PageLoading } from '@/components/page-state';
import { AuthCard } from '@/features/auth/auth-card';
import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in"
      description="Welcome back to DokSaBahay."
      footer={
        <>
          New here?{' '}
          <Link href="/register/patient" className="text-foreground underline underline-offset-4">
            Register as a patient
          </Link>{' '}
          or{' '}
          <Link href="/register/doctor" className="text-foreground underline underline-offset-4">
            join as a doctor
          </Link>
          .
        </>
      }
    >
      {/* useSearchParams (for ?next=) needs a Suspense boundary. */}
      <Suspense fallback={<PageLoading />}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
