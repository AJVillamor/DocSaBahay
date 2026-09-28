'use client';

import type { Appointment } from '@doksabahay/shared';
import { useState } from 'react';

import { PageError, PageLoading } from '@/components/page-state';
import { Button } from '@/components/ui/button';

import { AppointmentCard } from './appointment-card';
import { CancelDialog } from './cancel-dialog';
import { RescheduleDialog } from './reschedule-dialog';
import { type AppointmentScope, useAppointments } from './use-appointments';

const SCOPES: { value: AppointmentScope; label: string }[] = [
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
];

/** `/patient/appointments`: upcoming/past tabs, reschedule and cancel. */
export function PatientAppointmentsPage() {
  const [scope, setScope] = useState<AppointmentScope>('upcoming');
  const [page, setPage] = useState(1);
  const [rescheduling, setRescheduling] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const appointments = useAppointments(scope, page);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
        <p className="text-muted-foreground">Your upcoming and past consultations.</p>
      </div>

      <div role="tablist" aria-label="Appointment scope" className="flex gap-2">
        {SCOPES.map(({ value, label }) => (
          <Button
            key={value}
            type="button"
            role="tab"
            aria-selected={scope === value}
            variant={scope === value ? 'default' : 'outline'}
            onClick={() => {
              setScope(value);
              setPage(1);
            }}
          >
            {label}
          </Button>
        ))}
      </div>

      {appointments.isPending ? <PageLoading label="Loading appointments…" /> : null}
      {appointments.isError ? (
        <PageError
          message={appointments.error.message}
          onRetry={() => void appointments.refetch()}
        />
      ) : null}
      {appointments.data && appointments.data.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {scope === 'upcoming'
            ? "You don't have any upcoming appointments yet."
            : 'No past appointments yet.'}
        </p>
      ) : null}

      {appointments.data && appointments.data.items.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {appointments.data.items.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              viewer="PATIENT"
              onReschedule={scope === 'upcoming' ? () => setRescheduling(appointment) : undefined}
              onCancel={scope === 'upcoming' ? () => setCancelling(appointment) : undefined}
            />
          ))}
        </ul>
      ) : null}

      {appointments.data && appointments.data.totalCount > appointments.data.pageSize ? (
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page * appointments.data.pageSize >= appointments.data.totalCount}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <RescheduleDialog
        appointment={rescheduling}
        onOpenChange={(open) => {
          if (!open) setRescheduling(null);
        }}
      />
      <CancelDialog
        appointment={cancelling}
        reasonRequired={false}
        onOpenChange={(open) => {
          if (!open) setCancelling(null);
        }}
      />
    </div>
  );
}
