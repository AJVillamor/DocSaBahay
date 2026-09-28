'use client';

import { VerificationStatus } from '@doksabahay/shared';
import { Clock, ShieldX } from 'lucide-react';

import { useAuth } from '@/features/auth/use-auth';

/** Persistent notice for doctors whose profile is not approved yet (or was rejected). */
export function VerificationBanner() {
  const { user } = useAuth();
  const status = user?.verificationStatus;

  if (status === VerificationStatus.PENDING) {
    return (
      <div
        role="status"
        className="flex gap-3 border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-50"
      >
        <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          <strong className="font-semibold">Your profile is under review.</strong> An administrator
          is checking your details. Patients can book you once your profile is approved.
        </p>
      </div>
    );
  }

  if (status === VerificationStatus.REJECTED) {
    return (
      <div
        role="status"
        className="flex gap-3 border-b border-red-300 bg-red-50 px-4 py-3 text-sm text-red-950 dark:border-red-800 dark:bg-red-950 dark:text-red-50"
      >
        <ShieldX className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="flex flex-col gap-1">
          <p>
            <strong className="font-semibold">Your profile was not approved.</strong> Patients
            cannot book you until it is approved.
          </p>
          {user?.reviewNote ? <p>Reviewer&apos;s note: {user.reviewNote}</p> : null}
        </div>
      </div>
    );
  }

  return null;
}
