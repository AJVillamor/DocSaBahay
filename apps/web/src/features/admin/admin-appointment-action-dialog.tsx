'use client';

import type { AdminAppointmentSummary } from '@doksabahay/shared';
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

import { useCancelAdminAppointment, useInvalidateAdminAppointment } from './use-admin-appointments';

const REASON_MAX_LENGTH = 500;

export type AdminAppointmentActionKind = 'cancel' | 'invalidate';

const COPY: Record<AdminAppointmentActionKind, { title: string; description: string; cta: string; pending: string }> = {
  cancel: {
    title: 'Cancel appointment',
    description: 'Both the patient and doctor will be notified. This cannot be undone.',
    cta: 'Cancel appointment',
    pending: 'Cancelling…',
  },
  invalidate: {
    title: 'Invalidate appointment',
    description:
      'Use this for an appointment that should never have remained valid (e.g. flagged as an issue). Both participants will be notified.',
    cta: 'Invalidate appointment',
    pending: 'Invalidating…',
  },
};

/**
 * Sheet-based confirmation for the two admin-only forced state transitions.
 * `reason` is always required (unlike a participant's own cancel).
 */
export function AdminAppointmentActionDialog({
  appointment,
  action,
  onOpenChange,
}: {
  appointment: AdminAppointmentSummary | null;
  action: AdminAppointmentActionKind;
  onOpenChange: (open: boolean) => void;
}) {
  const [reason, setReason] = useState('');
  const cancel = useCancelAdminAppointment();
  const invalidateMutation = useInvalidateAdminAppointment();
  const mutation = action === 'cancel' ? cancel : invalidateMutation;
  const open = appointment !== null;
  const copy = COPY[action];
  const reasonMissing = reason.trim().length === 0;

  const close = (next: boolean): void => {
    if (!next) {
      setReason('');
      mutation.reset();
    }
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={close}>
      <SheetContent side="right" className="gap-4 px-4 py-4">
        <SheetHeader className="p-0">
          <SheetTitle>{copy.title}</SheetTitle>
          <SheetDescription>
            {appointment
              ? `${appointment.patient.firstName} ${appointment.patient.lastName} with Dr. ${appointment.doctor.lastName}, ${new Date(appointment.startAt).toLocaleString()}. ${copy.description}`
              : copy.description}
          </SheetDescription>
        </SheetHeader>

        {mutation.error ? <FormAlert>{mutation.error.message}</FormAlert> : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-appointment-action-reason">Reason</Label>
          <Textarea
            id="admin-appointment-action-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={REASON_MAX_LENGTH}
            rows={3}
            aria-invalid={reasonMissing}
            placeholder="Explain why — this is shown to both participants."
          />
        </div>

        <SheetFooter className="p-0">
          <Button
            type="button"
            variant="destructive"
            disabled={!appointment || mutation.isPending || reasonMissing}
            onClick={() => {
              if (!appointment) return;
              mutation.mutate(
                { id: appointment.id, input: { reason: reason.trim() } },
                { onSuccess: () => close(false) },
              );
            }}
          >
            {mutation.isPending ? copy.pending : copy.cta}
          </Button>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Keep appointment
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
