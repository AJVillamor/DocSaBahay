'use client';

import { ErrorCode, type Appointment, type Slot } from '@doksabahay/shared';
import { useState } from 'react';

import { FormAlert } from '@/components/form/form-alert';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { SlotPicker } from './slot-picker';
import { useRescheduleAppointment } from './use-appointments';

/**
 * Sheet-based dialog (no separate dialog primitive exists yet, matching
 * `ScheduleConflictDialog`'s precedent) that reuses `SlotPicker` — the same
 * date-strip + slot-grid component the booking flow uses — to pick a new
 * free time for an appointment the signed-in patient owns.
 */
export function RescheduleDialog({
  appointment,
  onOpenChange,
}: {
  appointment: Appointment | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [slot, setSlot] = useState<Slot | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const reschedule = useRescheduleAppointment();

  const open = appointment !== null;

  const close = (next: boolean): void => {
    if (!next) {
      setSlot(null);
      setStaleNotice(null);
      reschedule.reset();
    }
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="right" className="gap-4 overflow-y-auto px-4 py-4">
        <SheetHeader className="p-0">
          <SheetTitle>Reschedule appointment</SheetTitle>
          <SheetDescription>
            Pick a new free time. This is only possible until 2 hours before your current
            appointment.
          </SheetDescription>
        </SheetHeader>

        {staleNotice ? <FormAlert>{staleNotice}</FormAlert> : null}
        {reschedule.error && !staleNotice ? <FormAlert>{reschedule.error.message}</FormAlert> : null}

        {appointment ? (
          <SlotPicker
            key={refreshKey}
            doctorId={appointment.doctorId}
            selected={slot?.startAt ?? null}
            onSelect={setSlot}
          />
        ) : null}

        <SheetFooter className="p-0">
          <Button
            type="button"
            disabled={!slot || !appointment || reschedule.isPending}
            onClick={() => {
              if (!appointment || !slot) return;
              setStaleNotice(null);
              reschedule.mutate(
                { id: appointment.id, input: { startAt: slot.startAt } },
                {
                  onSuccess: () => close(false),
                  onError: (error) => {
                    if (error.code === ErrorCode.SLOT_TAKEN || error.code === ErrorCode.PATIENT_OVERLAP) {
                      setSlot(null);
                      setRefreshKey((key) => key + 1);
                      setStaleNotice('That time was just taken. Please pick another slot.');
                    }
                  },
                },
              );
            }}
          >
            {reschedule.isPending ? 'Rescheduling…' : 'Confirm new time'}
          </Button>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Keep current time
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
