'use client';

import { PageError, PageLoading } from '@/components/page-state';

import { RecordsTimeline } from './records-timeline';
import { usePatientRecords } from './use-records';

/** `/patient/records`: timeline of past consultations with finalized notes and issued prescriptions. */
export function PatientRecordsPage() {
  const records = usePatientRecords();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Records</h1>
        <p className="text-muted-foreground">
          Your past consultations, finalized notes and issued prescriptions.
        </p>
      </div>

      {records.isPending ? <PageLoading label="Loading records…" /> : null}
      {records.isError ? (
        <PageError message={records.error.message} onRetry={() => void records.refetch()} />
      ) : null}
      {records.data ? <RecordsTimeline entries={records.data.items} viewer="PATIENT" /> : null}
    </div>
  );
}
