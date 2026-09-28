'use client';

import Link from 'next/link';

import { PageError, PageLoading } from '@/components/page-state';
import { buttonVariants } from '@/components/ui/button';
import { ApiError } from '@/lib/api';

import { PatientProfileForm } from './patient-profile-form';
import { usePatientProfile } from './use-patient-profile';

/**
 * `/patient/profile`: loads the caller's profile and renders the edit form,
 * with loading, empty (no profile saved yet) and error states.
 */
export function PatientProfileView() {
  const { data, isPending, error, refetch } = usePatientProfile();

  if (isPending) {
    return <PageLoading label="Loading your profile…" />;
  }

  if (!data) {
    if (error instanceof ApiError && error.statusCode === 404) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center">
          <p className="font-medium">No profile yet</p>
          <p className="text-sm text-muted-foreground">
            Complete onboarding first to create your profile.
          </p>
          <Link href="/patient/onboarding" className={buttonVariants()}>
            Go to onboarding
          </Link>
        </div>
      );
    }
    return (
      <PageError
        message={error?.message ?? 'Could not load your profile.'}
        onRetry={() => void refetch()}
      />
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My profile</h1>
        <p className="text-muted-foreground">
          Keep your details up to date so your doctor has accurate information.
        </p>
      </div>
      <PatientProfileForm profile={data} />
    </div>
  );
}
