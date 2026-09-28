'use client';

import type { Prescription, RecordEntry } from '@doksabahay/shared';
import { DateTime } from 'luxon';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PrintablePrescription } from '@/features/consultations/printable-prescription';
import { cn } from '@/lib/utils';

function NoteField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm break-words">{value}</p>
    </div>
  );
}

/**
 * Expandable timeline of past consultations with a finalized note and/or
 * issued prescriptions. Shared by the patient's own records page and a
 * doctor's per-patient records page — `viewer` only changes which side of
 * each entry (doctor vs. patient) is shown as the headline name, since the
 * API already returns both.
 */
export function RecordsTimeline({
  entries,
  viewer,
}: {
  entries: RecordEntry[];
  viewer: 'PATIENT' | 'DOCTOR';
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [printing, setPrinting] = useState<Prescription | null>(null);

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">No consultation records yet.</p>;
  }

  return (
    <>
      <ul className="flex flex-col gap-3">
        {entries.map((entry) => {
          const isOpen = openId === entry.appointmentId;
          const name =
            viewer === 'PATIENT'
              ? `Dr. ${entry.doctor.firstName} ${entry.doctor.lastName}`
              : `${entry.patient.firstName} ${entry.patient.lastName}`;
          const panelId = `record-${entry.appointmentId}`;

          return (
            <li key={entry.appointmentId}>
              <Card>
                <CardHeader className="flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle>{name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {DateTime.fromISO(entry.startAt).toLocaleString(DateTime.DATETIME_MED)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenId(isOpen ? null : entry.appointmentId)}
                  >
                    <ChevronDown className={cn('transition-transform', isOpen && 'rotate-180')} />
                    {isOpen ? 'Hide' : 'View'}
                  </Button>
                </CardHeader>
                {isOpen ? (
                  <CardContent id={panelId} className="flex flex-col gap-4">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">Reason for visit</p>
                      <p className="text-sm break-words">{entry.reasonForVisit}</p>
                    </div>

                    {entry.note ? (
                      <div className="flex flex-col gap-2 rounded-lg border p-3">
                        <p className="text-sm font-medium">Consultation note</p>
                        <NoteField label="Chief complaint" value={entry.note.chiefComplaint} />
                        <NoteField label="Findings" value={entry.note.findings} />
                        {entry.note.diagnosis ? (
                          <NoteField label="Diagnosis" value={entry.note.diagnosis} />
                        ) : null}
                        <NoteField label="Recommendations" value={entry.note.recommendations} />
                        <NoteField label="Summary" value={entry.note.summary} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No finalized note for this visit.</p>
                    )}

                    {entry.prescriptions.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        <p className="text-xs font-medium text-muted-foreground">Prescriptions</p>
                        <ul className="flex flex-col gap-2">
                          {entry.prescriptions.map((prescription) => (
                            <li
                              key={prescription.id}
                              className="flex items-center justify-between rounded-lg border p-2 text-sm"
                            >
                              <span>{prescription.items.length} medication(s)</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setPrinting(prescription)}
                              >
                                Print
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </CardContent>
                ) : null}
              </Card>
            </li>
          );
        })}
      </ul>

      {printing ? <PrintablePrescription prescription={printing} onClose={() => setPrinting(null)} /> : null}
    </>
  );
}
