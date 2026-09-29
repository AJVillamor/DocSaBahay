'use client';

import type { AdminAppointmentSummary } from '@doksabahay/shared';
import { useEffect, useState } from 'react';

import { FormAlert } from '@/components/form/form-alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

import { useSetAdminAppointmentDateTime } from './use-admin-appointments';

/** `yyyy-MM-ddThh:mm` in the browser's local timezone, for a `datetime-local` input's value. */
function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Sheet-based demo/admin tool: moves an appointment to any date and time,
 * down to the minute, bypassing every normal booking rule. See
 * `AdminAppointmentsService.setDateTime` for exactly what that means and why.
 */
export function AdminAppointmentDateTimeDialog({
  appointment,
  onOpenChange,
}: {
  appointment: AdminAppointmentSummary | null;
  onOpenChange: (open: boolean) => void;
}) {
  const [value, setValue] = useState('');
  const setDateTime = useSetAdminAppointmentDateTime();
  const open = appointment !== null;

  // `open` is fully controlled by the parent (via `appointment`), so this
  // can't run in the Sheet's own `onOpenChange` — that only fires from the
  // component's own triggers (Escape, overlay click, its close button), never
  // from an external `open` prop change.
  useEffect(() => {
    if (appointment) {
      setValue(toLocalInputValue(appointment.startAt));
    }
  }, [appointment]);

  const close = (next: boolean): void => {
    if (!next) {
      setValue('');
      setDateTime.reset();
    }
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="right" className="gap-4 px-4 py-4">
        <SheetHeader className="p-0">
          <SheetTitle>Edit date &amp; time</SheetTitle>
          <SheetDescription>
            Demo tool: moves this appointment to any time, down to the minute. Skips every normal
            booking rule (slot alignment, lead time, limits) — only a doctor/patient double-booking
            is still blocked. The appointment&apos;s length is kept the same. No one is notified.
          </SheetDescription>
        </SheetHeader>

        {setDateTime.error ? <FormAlert>{setDateTime.error.message}</FormAlert> : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-appointment-datetime">New start</Label>
          <input
            id="admin-appointment-datetime"
            type="datetime-local"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors hover:border-primary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
        </div>

        <SheetFooter className="p-0">
          <Button
            type="button"
            disabled={!appointment || setDateTime.isPending || !value}
            onClick={() => {
              if (!appointment || !value) return;
              setDateTime.mutate(
                { id: appointment.id, input: { startAt: new Date(value).toISOString() } },
                { onSuccess: () => close(false) },
              );
            }}
          >
            {setDateTime.isPending ? 'Saving…' : 'Save new time'}
          </Button>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
