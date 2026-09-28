'use client';

import { PageError, PageLoading } from '@/components/page-state';

import { DoctorProfileForm } from './doctor-profile-form';
import { useDoctorProfile } from './use-doctor-profile';

/** `/doctor/profile`: view and edit the signed-in doctor's profile. */
export function DoctorProfilePage() {
  const profile = useDoctorProfile();

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your profile</h1>
        <p className="text-muted-foreground">
          Patients see this when choosing a doctor. Changing your specializations or license number
          sends your profile back for review.
        </p>
      </div>

      {profile.isPending ? <PageLoading label="Loading your profile…" /> : null}
      {profile.isError ? (
        <PageError message={profile.error.message} onRetry={() => void profile.refetch()} />
      ) : null}
      {profile.data ? <DoctorProfileForm profile={profile.data} /> : null}
    </div>
  );
}
