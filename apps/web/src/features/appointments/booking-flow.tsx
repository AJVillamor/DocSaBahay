'use client';

import { ErrorCode, type Slot } from '@doksabahay/shared';
import { DateTime } from 'luxon';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { FormAlert } from '@/components/form/form-alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { SlotPicker } from './slot-picker';
import { useCreateAppointment } from './use-appointments';

const REASON_MIN_LENGTH = 5;
const REASON_MAX_LENGTH = 500;

type Step = 'select' | 'confirm' | 'success';

/**
 * `/patient/book/[doctorId]`: date strip + slot grid, reason for visit,
 * confirmation, then a success screen. Self-contained (does not depend on a
 * doctor public-profile page, which lives on a different, unavailable
 * parallel branch) — it only needs the doctor id.
 */
export function BookingFlow({ doctorId }: { doctorId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('select');
  const [slot, setSlot] = useState<Slot | null>(null);
  const [slotRefreshKey, setSlotRefreshKey] = useState(0);
  const [reason, setReason] = useState('');
  const [staleNotice, setStaleNotice] = useState<string | null>(null);
  const createAppointment = useCreateAppointment();

  const reasonTooShort = reason.trim().length > 0 && reason.trim().length < REASON_MIN_LENGTH;
  const canContinue = Boolean(slot) && reason.trim().length >= REASON_MIN_LENGTH;

  if (step === 'success' && createAppointment.data) {
    const booked = createAppointment.data;
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Appointment booked</h1>
        <p className="text-muted-foreground">
          Your visit with Dr. {booked.doctor.firstName} {booked.doctor.lastName} is confirmed for{' '}
          {DateTime.fromISO(booked.startAt).toLocaleString(DateTime.DATETIME_MED)}.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => router.push('/patient/appointments')}>
            View my appointments
          </Button>
          <Button variant="outline" onClick={() => router.push('/patient')}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Book an appointment</h1>
        <p className="text-muted-foreground">
          Choose a free time, tell the doctor why you&apos;re visiting, then confirm.
        </p>
      </div>

      {step === 'select' ? (
        <section className="flex flex-col gap-4">
          {staleNotice ? <FormAlert>{staleNotice}</FormAlert> : null}
          <SlotPicker
            key={slotRefreshKey}
            doctorId={doctorId}
            selected={slot?.startAt ?? null}
            onSelect={(picked) => setSlot(picked)}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reason">Reason for visit</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={REASON_MAX_LENGTH}
              rows={4}
              placeholder="Briefly describe what you'd like to discuss (at least 5 characters)."
              aria-invalid={reasonTooShort}
              aria-describedby="reason-hint"
            />
            <p id="reason-hint" className="text-xs text-muted-foreground">
              {reason.trim().length}/{REASON_MAX_LENGTH} characters
              {reasonTooShort ? ` — use at least ${REASON_MIN_LENGTH}.` : ''}
            </p>
          </div>

          <Button type="button" size="lg" disabled={!canContinue} onClick={() => setStep('confirm')}>
            Continue
          </Button>
        </section>
      ) : null}

      {step === 'confirm' && slot ? (
        <section className="flex flex-col gap-4">
          {createAppointment.error ? (
            <FormAlert>{createAppointment.error.message}</FormAlert>
          ) : null}

          <div className="rounded-lg border p-4">
            <p className="font-medium">
              {DateTime.fromISO(slot.startAt).toLocaleString(DateTime.DATETIME_MED)}
            </p>
            <p className="mt-2 text-sm break-words whitespace-pre-wrap text-muted-foreground">
              {reason.trim()}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={createAppointment.isPending}
              onClick={() => setStep('select')}
            >
              Back
            </Button>
            <Button
              type="button"
              disabled={createAppointment.isPending}
              onClick={() => {
                setStaleNotice(null);
                createAppointment.mutate(
                  { doctorId, startAt: slot.startAt, reasonForVisit: reason.trim() },
                  {
                    onSuccess: () => setStep('success'),
                    onError: (error) => {
                      if (
                        error.code === ErrorCode.SLOT_TAKEN ||
                        error.code === ErrorCode.PATIENT_OVERLAP
                      ) {
                        setStaleNotice('That time was just taken. Please pick another slot.');
                        setSlot(null);
                        setSlotRefreshKey((key) => key + 1);
                        setStep('select');
                      }
                    },
                  },
                );
              }}
            >
              {createAppointment.isPending ? 'Booking…' : 'Confirm booking'}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
