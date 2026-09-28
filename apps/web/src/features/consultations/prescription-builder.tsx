'use client';

import {
  MEDICATION_FIELD_MAX_LENGTH,
  PRESCRIPTION_INSTRUCTIONS_MAX_LENGTH,
  PRESCRIPTION_ITEMS_MAX,
  PrescriptionStatus,
  SessionState,
  type Prescription,
  type PrescriptionItemInput,
} from '@doksabahay/shared';
import { Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { FormAlert } from '@/components/form/form-alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

import { PrintablePrescription } from './printable-prescription';
import { useIssuePrescription, usePrescriptions, useUpsertPrescription } from './use-prescriptions';

const EMPTY_ITEM: PrescriptionItemInput = {
  medicationName: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
};

function rowsFrom(draft: Prescription | undefined): PrescriptionItemInput[] {
  if (!draft || draft.items.length === 0) {
    return [{ ...EMPTY_ITEM }];
  }
  return draft.items.map((item) => ({ ...item, instructions: item.instructions ?? '' }));
}

/**
 * Doctor's prescription builder: add/remove medication rows (local state,
 * explicit "Save draft" rather than autosave), and an Issue action behind a
 * confirmation dialog. Also lists prescriptions already issued this
 * consultation, each with a printable view. Mount with `key={appointmentId}`
 * from the parent so switching appointments resets local state.
 */
export function PrescriptionBuilder({
  appointmentId,
  sessionState,
}: {
  appointmentId: string;
  sessionState: SessionState;
}) {
  const query = usePrescriptions(appointmentId);
  const upsert = useUpsertPrescription();
  const issue = useIssuePrescription();
  const [rows, setRows] = useState<PrescriptionItemInput[]>([{ ...EMPTY_ITEM }]);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [printing, setPrinting] = useState<Prescription | null>(null);
  const initializedRef = useRef(false);

  const items = query.data?.items ?? [];
  const draft = items.find((item) => item.status === PrescriptionStatus.DRAFT);
  const issued = items.filter((item) => item.status === PrescriptionStatus.ISSUED);

  useEffect(() => {
    if (!initializedRef.current && query.data !== undefined) {
      setRows(rowsFrom(draft));
      initializedRef.current = true;
    }
    // Only runs once, on first load — re-running on every `draft` change would
    // clobber what the doctor is currently typing whenever the query refetches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data]);

  const canWrite = sessionState === SessionState.IN_PROGRESS || sessionState === SessionState.COMPLETED;
  const rowsValid = rows.every(
    (row) => row.medicationName.trim() && row.dosage.trim() && row.frequency.trim() && row.duration.trim(),
  );

  const updateRow = (index: number, patch: Partial<PrescriptionItemInput>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const addRow = () => {
    setRows((current) => (current.length >= PRESCRIPTION_ITEMS_MAX ? current : [...current, { ...EMPTY_ITEM }]));
  };
  const removeRow = (index: number) => {
    setRows((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  };

  const saveDraft = () => {
    const cleaned = rows.map((row) => ({
      medicationName: row.medicationName.trim(),
      dosage: row.dosage.trim(),
      frequency: row.frequency.trim(),
      duration: row.duration.trim(),
      instructions: row.instructions?.trim() || undefined,
    }));
    upsert.mutate({ appointmentId, input: { items: cleaned } });
  };

  if (query.isPending) {
    return <p className="text-sm text-muted-foreground">Loading prescriptions…</p>;
  }
  if (query.isError) {
    return <FormAlert>{query.error.message}</FormAlert>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-medium">Prescription</h3>

      {upsert.error ? <FormAlert>{upsert.error.message}</FormAlert> : null}
      {issue.error ? <FormAlert>{issue.error.message}</FormAlert> : null}

      <div className="flex flex-col gap-3">
        {rows.map((row, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor={`med-name-${index}`}>Medication</Label>
                <Input
                  id={`med-name-${index}`}
                  value={row.medicationName}
                  maxLength={MEDICATION_FIELD_MAX_LENGTH}
                  onChange={(event) => updateRow(index, { medicationName: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`med-dosage-${index}`}>Dosage</Label>
                <Input
                  id={`med-dosage-${index}`}
                  value={row.dosage}
                  maxLength={MEDICATION_FIELD_MAX_LENGTH}
                  onChange={(event) => updateRow(index, { dosage: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`med-frequency-${index}`}>Frequency</Label>
                <Input
                  id={`med-frequency-${index}`}
                  value={row.frequency}
                  maxLength={MEDICATION_FIELD_MAX_LENGTH}
                  onChange={(event) => updateRow(index, { frequency: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor={`med-duration-${index}`}>Duration</Label>
                <Input
                  id={`med-duration-${index}`}
                  value={row.duration}
                  maxLength={MEDICATION_FIELD_MAX_LENGTH}
                  onChange={(event) => updateRow(index, { duration: event.target.value })}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor={`med-instructions-${index}`}>Instructions (optional)</Label>
              <Textarea
                id={`med-instructions-${index}`}
                value={row.instructions ?? ''}
                maxLength={PRESCRIPTION_INSTRUCTIONS_MAX_LENGTH}
                rows={2}
                onChange={(event) => updateRow(index, { instructions: event.target.value })}
              />
            </div>
            {rows.length > 1 ? (
              <Button type="button" variant="ghost" size="sm" className="self-end" onClick={() => removeRow(index)}>
                <Trash2 /> Remove
              </Button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={rows.length >= PRESCRIPTION_ITEMS_MAX}
          onClick={addRow}
        >
          Add medication
        </Button>
        <Button type="button" size="sm" disabled={!canWrite || !rowsValid || upsert.isPending} onClick={saveDraft}>
          {upsert.isPending ? 'Saving…' : 'Save draft'}
        </Button>
        {draft ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canWrite || issue.isPending}
            onClick={() => setConfirmId(draft.id)}
          >
            Issue prescription
          </Button>
        ) : null}
      </div>

      {issued.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h4 className="text-xs font-medium text-muted-foreground">Issued this consultation</h4>
          <ul className="flex flex-col gap-2">
            {issued.map((prescription) => (
              <li key={prescription.id} className="flex items-center justify-between rounded-lg border p-2 text-sm">
                <span>{prescription.items.length} medication(s)</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPrinting(prescription)}>
                  Print
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Sheet open={confirmId !== null} onOpenChange={(open) => !open && setConfirmId(null)}>
        <SheetContent side="right" className="gap-4 px-4 py-4">
          <SheetHeader className="p-0">
            <SheetTitle>Issue prescription?</SheetTitle>
            <SheetDescription>
              Once issued, this prescription becomes visible to the patient and can no longer be edited.
            </SheetDescription>
          </SheetHeader>
          <SheetFooter className="p-0">
            <Button
              type="button"
              disabled={issue.isPending}
              onClick={() => {
                if (!confirmId) return;
                issue.mutate({ id: confirmId, appointmentId }, { onSuccess: () => setConfirmId(null) });
              }}
            >
              {issue.isPending ? 'Issuing…' : 'Issue prescription'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setConfirmId(null)}>
              Cancel
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {printing ? <PrintablePrescription prescription={printing} onClose={() => setPrinting(null)} /> : null}
    </div>
  );
}
