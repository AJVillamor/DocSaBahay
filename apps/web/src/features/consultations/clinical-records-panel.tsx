'use client';

import type { SessionState } from '@doksabahay/shared';

import { NoteEditor } from './note-editor';
import { PrescriptionBuilder } from './prescription-builder';

/**
 * Doctor-only right-hand panel of the consultation workspace: the note
 * editor and the prescription builder. Both child components are keyed by
 * `appointmentId` so their local draft state resets on navigating between
 * consultations rather than leaking the previous appointment's draft text.
 */
export function ClinicalRecordsPanel({
  appointmentId,
  sessionState,
}: {
  appointmentId: string;
  sessionState: SessionState;
}) {
  return (
    <div className="flex flex-col gap-6">
      <NoteEditor key={`note-${appointmentId}`} appointmentId={appointmentId} sessionState={sessionState} />
      <div className="border-t pt-4">
        <PrescriptionBuilder
          key={`prescriptions-${appointmentId}`}
          appointmentId={appointmentId}
          sessionState={sessionState}
        />
      </div>
    </div>
  );
}
