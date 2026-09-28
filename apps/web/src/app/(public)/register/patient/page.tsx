import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthCard } from '@/features/auth/auth-card';
import { RegisterPatientForm } from '@/features/auth/register-patient-form';

export const metadata: Metadata = { title: 'Register as a patient' };

export default function RegisterPatientPage() {
  return (
    <AuthCard
      title="Register as a patient"
      description="Create an account to consult doctors from home. Use fictional details only."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
          . Are you a doctor?{' '}
          <Link href="/register/doctor" className="text-foreground underline underline-offset-4">
            Join as a doctor
          </Link>
          .
        </>
      }
    >
      <RegisterPatientForm />
    </AuthCard>
  );
}
