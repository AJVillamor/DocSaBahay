'use client';

import Link from 'next/link';

import { PageError, PageLoading } from '@/components/page-state';

import { RecordsTimeline } from './records-timeline';
import { usePatientRecordsForDoctor } from './use-records';

/** `/doctor/patients/:id`: one patient's finalized notes and issued prescriptions, across every treating doctor. */
export function DoctorPatientDetailPage({ patientId }: { patientId: string }) {
  const records = usePatientRecordsForDoctor(patientId);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 lg:px-8">
      <Link href="/doctor/patients" className="text-sm text-muted-foreground hover:underline">
        ← Back to patients
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Patient records</h1>
        <p className="text-muted-foreground">
          Finalized notes and issued prescriptions across every consultation.
        </p>
      </div>

      {records.isPending ? <PageLoading label="Loading records…" /> : null}
      {records.isError ? (
        <PageError message={records.error.message} onRetry={() => void records.refetch()} />
      ) : null}
      {records.data ? <RecordsTimeline entries={records.data.items} viewer="DOCTOR" /> : null}
    </div>
  );
}
