'use client';

import type { AffectedAppointment } from '@doksabahay/shared';
import { useState } from 'react';

import { useAuth } from '@/features/auth/use-auth';

import { ExceptionsEditor } from './schedule/exceptions-editor';
import { ScheduleConflictDialog } from './schedule/schedule-conflict-dialog';
import { SlotPreview } from './schedule/slot-preview';
import { WeeklyAvailabilityEditor } from './schedule/weekly-availability-editor';

/** `/doctor/schedule`: weekly availability, time off, and a free-slot preview. */
export function DoctorSchedulePage() {
  const { user } = useAuth();
  const [conflict, setConflict] = useState<AffectedAppointment[] | null>(null);

  if (!user) {
    // The role layout's RoleGuard guarantees a signed-in user before this renders;
    // this is only a defensive fallback while that resolves.
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-muted-foreground">
          Set your weekly hours and block off time off. A change that would remove time already
          booked by a patient is rejected — cancel the appointment first.
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Weekly availability</h2>
        <WeeklyAvailabilityEditor onConflict={setConflict} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Time off</h2>
        <ExceptionsEditor onConflict={setConflict} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-medium">Next 14 days preview</h2>
        <SlotPreview doctorId={user.id} />
      </section>

      <ScheduleConflictDialog
        appointments={conflict}
        onOpenChange={(open) => {
          if (!open) setConflict(null);
        }}
      />
    </div>
  );
}
