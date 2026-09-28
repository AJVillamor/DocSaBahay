import type { Metadata } from 'next';
import Link from 'next/link';

import { AuthCard } from '@/features/auth/auth-card';
import { RegisterDoctorForm } from '@/features/auth/register-doctor-form';

export const metadata: Metadata = { title: 'Join as a doctor' };

export default function RegisterDoctorPage() {
  return (
    <AuthCard
      title="Join as a doctor"
      description="Offer online consultations. Use fictional details only."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-foreground underline underline-offset-4">
            Sign in
          </Link>
          .
        </>
      }
    >
      <RegisterDoctorForm />
    </AuthCard>
  );
}
