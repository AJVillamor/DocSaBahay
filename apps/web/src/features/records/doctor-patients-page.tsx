'use client';

import { DateTime } from 'luxon';
import Link from 'next/link';
import { useState } from 'react';

import { PageError, PageLoading } from '@/components/page-state';
import { Input } from '@/components/ui/input';
import { UserAvatar } from '@/components/user-avatar';
import { useDebouncedCallback } from '@/lib/use-debounced-callback';

import { useDoctorPatients } from './use-doctor-patients';

const SEARCH_DEBOUNCE_MS = 300;

/** `/doctor/patients`: searchable list of patients under the signed-in doctor's care. */
export function DoctorPatientsPage() {
  const [inputValue, setInputValue] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSetSearch = useDebouncedCallback(setSearch, SEARCH_DEBOUNCE_MS);
  const patients = useDoctorPatients(search);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Patients</h1>
        <p className="text-muted-foreground">Patients under your care.</p>
      </div>

      <Input
        placeholder="Search by name…"
        aria-label="Search patients by name"
        value={inputValue}
        onChange={(event) => {
          setInputValue(event.target.value);
          debouncedSetSearch(event.target.value.trim());
        }}
      />

      {patients.isPending ? <PageLoading label="Loading patients…" /> : null}
      {patients.isError ? (
        <PageError message={patients.error.message} onRetry={() => void patients.refetch()} />
      ) : null}
      {patients.data && patients.data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {search ? 'No patients match that search.' : "You don't have any patients yet."}
        </p>
      ) : null}

      {patients.data && patients.data.items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {patients.data.items.map((patient) => (
            <li key={patient.id}>
              <Link
                href={`/doctor/patients/${patient.id}`}
                className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
              >
                <UserAvatar
                  user={{
                    id: patient.id,
                    email: '',
                    profile: { firstName: patient.firstName, lastName: patient.lastName },
                  }}
                />
                <div className="min-w-0">
                  <p className="font-medium">
                    {patient.firstName} {patient.lastName}
                  </p>
                  {patient.lastAppointmentAt ? (
                    <p className="text-sm text-muted-foreground">
                      Last appointment{' '}
                      {DateTime.fromISO(patient.lastAppointmentAt).toLocaleString(DateTime.DATE_MED)}
                    </p>
                  ) : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
