'use client';

import { type AdminDoctorDetail, VerificationStatus } from '@doksabahay/shared';
import { useState } from 'react';

import { FormAlert } from '@/components/form/form-alert';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { useReviewDoctor } from './use-admin-doctors';

const NOTE_MAX_LENGTH = 1000;

/** Approve/reject panel for a doctor's `verificationStatus`. A note is required to reject. */
export function DoctorReviewPanel({ doctor }: { doctor: AdminDoctorDetail }) {
  const [note, setNote] = useState('');
  const review = useReviewDoctor();
  const noteMissing = note.trim().length === 0;

  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4">
      <div>
        <h2 className="font-medium">Review</h2>
        <p className="text-sm text-muted-foreground">
          Current status: <span className="font-medium">{doctor.verificationStatus}</span>
          {doctor.reviewNote ? ` — “${doctor.reviewNote}”` : ''}
        </p>
      </div>

      {review.isError ? <FormAlert>{review.error.message}</FormAlert> : null}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="doctor-review-note">Note (required to reject)</Label>
        <Textarea
          id="doctor-review-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={NOTE_MAX_LENGTH}
          rows={3}
          placeholder="e.g. License number could not be verified."
        />
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          disabled={review.isPending || doctor.verificationStatus === VerificationStatus.APPROVED}
          onClick={() =>
            review.mutate({
              id: doctor.id,
              input: { decision: 'APPROVED', note: note.trim() || undefined },
            })
          }
        >
          {review.isPending ? 'Saving…' : 'Approve'}
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={
            review.isPending ||
            noteMissing ||
            doctor.verificationStatus === VerificationStatus.REJECTED
          }
          onClick={() => review.mutate({ id: doctor.id, input: { decision: 'REJECTED', note } })}
        >
          Reject
        </Button>
      </div>

      {doctor.verificationStatus === VerificationStatus.PENDING ? null : (
        <p className="text-xs text-muted-foreground">
          {doctor.verificationStatus === VerificationStatus.APPROVED
            ? 'Already approved. Reject to reverse this decision.'
            : 'Already rejected. Approve to reverse this decision.'}
        </p>
      )}
    </div>
  );
}
