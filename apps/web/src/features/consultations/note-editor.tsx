'use client';

import { NOTE_FIELD_MAX_LENGTH, NoteStatus, SessionState, type ConsultationNote } from '@doksabahay/shared';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

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
import { useDebouncedCallback } from '@/lib/use-debounced-callback';

import { useConsultationNote, useFinalizeNote, useUpsertNote } from './use-notes';

const AUTOSAVE_DELAY_MS = 1500;

interface NoteFields {
  chiefComplaint: string;
  findings: string;
  diagnosis: string;
  recommendations: string;
  summary: string;
}

const EMPTY_FIELDS: NoteFields = {
  chiefComplaint: '',
  findings: '',
  diagnosis: '',
  recommendations: '',
  summary: '',
};

const FIELD_DEFS: { key: keyof NoteFields; label: string; rows: number; optional?: boolean }[] = [
  { key: 'chiefComplaint', label: 'Chief complaint', rows: 2 },
  { key: 'findings', label: 'Findings', rows: 4 },
  { key: 'diagnosis', label: 'Diagnosis', rows: 2, optional: true },
  { key: 'recommendations', label: 'Recommendations', rows: 3 },
  { key: 'summary', label: 'Summary', rows: 3 },
];

function fieldsFrom(note: ConsultationNote | null | undefined): NoteFields {
  if (!note) {
    return EMPTY_FIELDS;
  }
  return {
    chiefComplaint: note.chiefComplaint,
    findings: note.findings,
    diagnosis: note.diagnosis ?? '',
    recommendations: note.recommendations,
    summary: note.summary,
  };
}

/**
 * Doctor's note editor: five free-text fields, autosaved `AUTOSAVE_DELAY_MS`
 * after the last keystroke (`PUT .../note`) with a small saved indicator, and
 * a Finalize action behind a confirmation dialog. Read-only once FINALIZED.
 * Mount with `key={appointmentId}` from the parent so switching appointments
 * resets local state instead of leaking the previous note's draft text.
 */
export function NoteEditor({
  appointmentId,
  sessionState,
}: {
  appointmentId: string;
  sessionState: SessionState;
}) {
  const query = useConsultationNote(appointmentId);
  const upsert = useUpsertNote();
  const finalize = useFinalizeNote();
  const [fields, setFields] = useState<NoteFields>(EMPTY_FIELDS);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current && query.data !== undefined) {
      setFields(fieldsFrom(query.data));
      initializedRef.current = true;
    }
  }, [query.data]);

  const isFinalized = query.data?.status === NoteStatus.FINALIZED;

  const debouncedSave = useDebouncedCallback((next: NoteFields) => {
    upsert.mutate({
      appointmentId,
      input: {
        chiefComplaint: next.chiefComplaint,
        findings: next.findings,
        diagnosis: next.diagnosis,
        recommendations: next.recommendations,
        summary: next.summary,
      },
    });
  }, AUTOSAVE_DELAY_MS);

  const updateField = (key: keyof NoteFields) => (event: ChangeEvent<HTMLTextAreaElement>) => {
    const next = { ...fields, [key]: event.target.value };
    setFields(next);
    if (!isFinalized) {
      debouncedSave(next);
    }
  };

  const canFinalize =
    sessionState === SessionState.COMPLETED &&
    !isFinalized &&
    fields.chiefComplaint.trim().length > 0 &&
    fields.findings.trim().length > 0 &&
    fields.recommendations.trim().length > 0 &&
    fields.summary.trim().length > 0;

  const savedIndicator = isFinalized
    ? 'Finalized — read-only'
    : upsert.isPending
      ? 'Saving…'
      : upsert.isSuccess
        ? 'Saved'
        : null;

  if (query.isPending) {
    return <p className="text-sm text-muted-foreground">Loading note…</p>;
  }
  if (query.isError) {
    return <FormAlert>{query.error.message}</FormAlert>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Consultation note</h3>
        {savedIndicator ? <span className="text-xs text-muted-foreground">{savedIndicator}</span> : null}
      </div>

      {upsert.error ? <FormAlert>{upsert.error.message}</FormAlert> : null}
      {finalize.error ? <FormAlert>{finalize.error.message}</FormAlert> : null}

      {FIELD_DEFS.map(({ key, label, rows, optional }) => (
        <div key={key} className="flex flex-col gap-1.5">
          <Label htmlFor={`note-${key}`}>
            {label}
            {optional ? <span className="font-normal text-muted-foreground"> (optional)</span> : null}
          </Label>
          <Textarea
            id={`note-${key}`}
            value={fields[key]}
            maxLength={NOTE_FIELD_MAX_LENGTH}
            rows={rows}
            disabled={isFinalized}
            onChange={updateField(key)}
          />
        </div>
      ))}

      {!isFinalized ? (
        <Button
          type="button"
          variant="outline"
          disabled={!canFinalize || finalize.isPending}
          title={
            sessionState !== SessionState.COMPLETED
              ? 'Complete the consultation before finalizing the note.'
              : undefined
          }
          onClick={() => setConfirmOpen(true)}
        >
          {finalize.isPending ? 'Finalizing…' : 'Finalize note'}
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          This note is finalized and visible to the patient. It can no longer be edited.
        </p>
      )}

      <Sheet open={confirmOpen} onOpenChange={setConfirmOpen}>
        <SheetContent side="right" className="gap-4 px-4 py-4">
          <SheetHeader className="p-0">
            <SheetTitle>Finalize note?</SheetTitle>
            <SheetDescription>
              Once finalized, this note becomes visible to the patient and can no longer be edited.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="p-0">
            <Button
              type="button"
              disabled={finalize.isPending}
              onClick={() =>
                finalize.mutate(appointmentId, { onSuccess: () => setConfirmOpen(false) })
              }
            >
              {finalize.isPending ? 'Finalizing…' : 'Finalize note'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
