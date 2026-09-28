'use client';

import type { AffectedAppointment } from '@doksabahay/shared';
import { DateTime } from 'luxon';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

/**
 * Modal (built from `Sheet`, no separate dialog primitive exists yet) listing
 * the appointments a `SCHEDULE_CONFLICT` response says would be affected.
 * The doctor must cancel them elsewhere before retrying; nothing here
 * auto-cancels anything.
 */
export function ScheduleConflictDialog({
  appointments,
  onOpenChange,
}: {
  appointments: AffectedAppointment[] | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={appointments !== null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="gap-4 px-4 py-4">
        <SheetHeader className="p-0">
          <SheetTitle>This would affect booked appointments</SheetTitle>
          <SheetDescription>
            These patients already have a SCHEDULED appointment in this time. Cancel them first
            (from your consultations list), then try again.
          </SheetDescription>
        </SheetHeader>
        <ul className="flex flex-col gap-2 text-sm">
          {(appointments ?? []).map((appointment) => (
            <li key={appointment.id} className="rounded-lg border px-3 py-2">
              {DateTime.fromISO(appointment.startAt).toLocaleString(DateTime.DATETIME_MED)} –{' '}
              {DateTime.fromISO(appointment.endAt).toLocaleString(DateTime.TIME_SIMPLE)}
            </li>
          ))}
        </ul>
        <SheetFooter className="p-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
