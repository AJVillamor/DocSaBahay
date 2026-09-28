'use client';

import { DateTime } from 'luxon';
import { useMemo } from 'react';

import { PageError, PageLoading } from '@/components/page-state';

import { useDoctorSlots } from '../use-slots';

const PREVIEW_DAYS = 14;

/**
 * Read-only 14-day preview of the doctor's own generated free slots (calls
 * the same public `GET /doctors/:id/slots` a patient would use), displayed
 * in the browser's local timezone.
 */
export function SlotPreview({ doctorId }: { doctorId: string }) {
  // Computed once per mount so the query key stays stable across re-renders.
  const { from, to } = useMemo(() => {
    const now = DateTime.utc().startOf('minute');
    return { from: now.toISO() ?? '', to: now.plus({ days: PREVIEW_DAYS }).toISO() ?? '' };
  }, []);
  const slots = useDoctorSlots(doctorId, from, to);

  if (slots.isPending) {
    return <PageLoading label="Loading preview…" />;
  }
  if (slots.isError) {
    // The slots endpoint 404s for a doctor who isn't yet APPROVED + ACTIVE
    // (same "don't leak existence" rule it applies to patients) — a doctor
    // previewing their own not-yet-approved schedule hits this every time,
    // so show the same pending-review copy as the empty-slots case rather
    // than a raw "not found" error.
    if (slots.error.statusCode === 404) {
      return (
        <p className="text-sm text-muted-foreground">
          Your schedule preview isn&apos;t available until an administrator approves your profile.
          Once approved, this preview will show your next {PREVIEW_DAYS} days of free slots.
        </p>
      );
    }
    return <PageError message={slots.error.message} onRetry={() => void slots.refetch()} />;
  }
  if (slots.data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No free slots in the next {PREVIEW_DAYS} days. If your profile is still pending review,
        patients cannot book you yet.
      </p>
    );
  }

  const byDay = new Map<string, typeof slots.data>();
  for (const slot of slots.data) {
    const key = DateTime.fromISO(slot.startAt).toFormat('cccc, LLL d');
    byDay.set(key, [...(byDay.get(key) ?? []), slot]);
  }

  return (
    <div className="flex flex-col gap-3">
      {[...byDay.entries()].map(([day, daySlots]) => (
        <div key={day}>
          <h4 className="text-sm font-medium">{day}</h4>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {daySlots.map((slot) => (
              <span key={slot.startAt} className="rounded-md border px-2 py-1 text-xs">
                {DateTime.fromISO(slot.startAt).toFormat('h:mm a')}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
