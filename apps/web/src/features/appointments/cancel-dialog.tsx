'use client';

import type { Appointment } from '@doksabahay/shared';
import { useState } from 'react';

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
import { Textarea } from '@/components/ui/textarea';

import { useCancelAppointment } from './use-appointments';

const REASON_MAX_LENGTH = 500;

/**
 * Sheet-based cancel confirmation. `reasonRequired` is `true` on the
 * doctor's appointments page (the API rejects a doctor cancellation without
 * a reason) and `false` on the patient's (optional there).
 */
export function CancelDialog({
  appointment,
  reasonRequired,
  onOpenChange,
}: {
  appointment: Appointment | null;
  reasonRequired: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState('');
  const cancel = useCancelAppointment();
  const open = appointment !== null;
  const reasonMissing = reasonRequired && reason.trim().length === 0;

  const close = (next: boolean): void => {
    if (!next) {
      setReason('');
      cancel.reset();
    }
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="right" className="gap-4 px-4 py-4">
        <SheetHeader className="p-0">
          <SheetTitle>Cancel appointment</SheetTitle>
          <SheetDescription>
            {reasonRequired
              ? 'The patient will see this reason, so let them know why.'
              : 'You can optionally tell the doctor why.'}
          </SheetDescription>
        </SheetHeader>

        {cancel.error ? <FormAlert>{cancel.error.message}</FormAlert> : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cancel-reason">Reason{reasonRequired ? '' : ' (optional)'}</Label>
          <Textarea
            id="cancel-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={REASON_MAX_LENGTH}
            rows={3}
            aria-invalid={reasonMissing}
            placeholder={reasonRequired ? 'e.g. Doctor is unavailable at this time.' : undefined}
          />
        </div>

        <SheetFooter className="p-0">
          <Button
            type="button"
            variant="destructive"
            disabled={!appointment || cancel.isPending || reasonMissing}
            onClick={() => {
              if (!appointment) return;
              const trimmed = reason.trim();
              cancel.mutate(
                { id: appointment.id, input: trimmed ? { reason: trimmed } : {} },
                { onSuccess: () => close(false) },
              );
            }}
          >
            {cancel.isPending ? 'Cancelling…' : 'Cancel appointment'}
          </Button>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Keep appointment
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
