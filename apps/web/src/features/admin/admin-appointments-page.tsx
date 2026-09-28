'use client';

import { AppointmentStatus, SessionState, type AdminAppointmentSummary } from '@doksabahay/shared';
import { useState } from 'react';

import { PageError, PageLoading } from '@/components/page-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { AdminAppointmentActionDialog, type AdminAppointmentActionKind } from './admin-appointment-action-dialog';
import { AdminAppointmentDetailPanel } from './admin-appointment-detail-panel';
import { useAdminAppointments, type AdminAppointmentsFilters } from './use-admin-appointments';

const selectClassName =
  'h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30';

interface FormState {
  status: string;
  sessionState: string;
  doctorId: string;
  patientId: string;
  from: string;
  to: string;
}

const EMPTY_FORM: FormState = { status: '', sessionState: '', doctorId: '', patientId: '', from: '', to: '' };

function toIsoOrUndefined(dateInputValue: string, endOfDay: boolean): string | undefined {
  if (!dateInputValue) return undefined;
  return endOfDay ? `${dateInputValue}T23:59:59.999Z` : `${dateInputValue}T00:00:00.000Z`;
}

function statusVariant(status: AppointmentStatus): 'default' | 'secondary' | 'destructive' {
  if (status === AppointmentStatus.SCHEDULED) return 'default';
  if (status === AppointmentStatus.COMPLETED) return 'secondary';
  return 'destructive';
}

/**
 * `/admin/appointments`: filterable table of every appointment, a detail
 * drawer with the event timeline, and forced Cancel/Invalidate actions.
 */
export function AdminAppointmentsPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filters, setFilters] = useState<AdminAppointmentsFilters>({ page: 1 });
  const [selected, setSelected] = useState<AdminAppointmentSummary | null>(null);
  const [actionTarget, setActionTarget] = useState<{
    appointment: AdminAppointmentSummary;
    action: AdminAppointmentActionKind;
  } | null>(null);
  const appointments = useAdminAppointments(filters);

  function applyFilters(): void {
    setFilters({
      status: form.status || undefined,
      sessionState: form.sessionState || undefined,
      doctorId: form.doctorId.trim() || undefined,
      patientId: form.patientId.trim() || undefined,
      from: toIsoOrUndefined(form.from, false),
      to: toIsoOrUndefined(form.to, true),
      page: 1,
    });
  }

  function resetFilters(): void {
    setForm(EMPTY_FORM);
    setFilters({ page: 1 });
  }

  const totalPages = appointments.data
    ? Math.max(1, Math.ceil(appointments.data.totalCount / appointments.data.pageSize))
    : 1;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appointments</h1>
        <p className="text-muted-foreground">Oversight of every appointment&apos;s logistics and status.</p>
      </div>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          applyFilters();
        }}
        className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        <div className="flex flex-col gap-1.5">
          <label htmlFor="appt-status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="appt-status"
            className={cn(selectClassName)}
            value={form.status}
            onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
          >
            <option value="">Any status</option>
            {Object.values(AppointmentStatus).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="appt-session-state" className="text-sm font-medium">
            Session
          </label>
          <select
            id="appt-session-state"
            className={cn(selectClassName)}
            value={form.sessionState}
            onChange={(event) => setForm((prev) => ({ ...prev, sessionState: event.target.value }))}
          >
            <option value="">Any session state</option>
            {Object.values(SessionState).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="appt-doctor-id" className="text-sm font-medium">
            Doctor id
          </label>
          <Input
            id="appt-doctor-id"
            value={form.doctorId}
            onChange={(event) => setForm((prev) => ({ ...prev, doctorId: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="appt-patient-id" className="text-sm font-medium">
            Patient id
          </label>
          <Input
            id="appt-patient-id"
            value={form.patientId}
            onChange={(event) => setForm((prev) => ({ ...prev, patientId: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="appt-from" className="text-sm font-medium">
            Starts from
          </label>
          <Input
            id="appt-from"
            type="date"
            value={form.from}
            onChange={(event) => setForm((prev) => ({ ...prev, from: event.target.value }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="appt-to" className="text-sm font-medium">
            Starts to
          </label>
          <Input
            id="appt-to"
            type="date"
            value={form.to}
            onChange={(event) => setForm((prev) => ({ ...prev, to: event.target.value }))}
          />
        </div>
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-6">
          <Button type="submit">Filter</Button>
          <Button type="button" variant="outline" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </form>

      {appointments.isPending ? <PageLoading label="Loading appointments…" /> : null}
      {appointments.isError ? (
        <PageError message={appointments.error.message} onRetry={() => void appointments.refetch()} />
      ) : null}
      {appointments.data && appointments.data.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <p className="font-medium">No appointments match your filters</p>
          <p className="text-sm text-muted-foreground">Try widening your search.</p>
        </div>
      ) : null}

      {appointments.data && appointments.data.items.length > 0 ? (
        <>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2 font-medium">Starts</th>
                  <th className="px-4 py-2 font-medium">Patient</th>
                  <th className="px-4 py-2 font-medium">Doctor</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Session</th>
                  <th className="px-4 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {appointments.data.items.map((appointment) => (
                  <tr key={appointment.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                      {new Date(appointment.startAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      {appointment.patient.firstName} {appointment.patient.lastName}
                    </td>
                    <td className="px-4 py-2">
                      {appointment.doctor.title} {appointment.doctor.firstName} {appointment.doctor.lastName}
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={statusVariant(appointment.status)}>{appointment.status}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant="outline">{appointment.sessionState}</Badge>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelected(appointment)}
                        >
                          View
                        </Button>
                        {appointment.status === AppointmentStatus.SCHEDULED ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setActionTarget({ appointment, action: 'cancel' })}
                          >
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Page {filters.page} of {totalPages} · {appointments.data.totalCount} appointment
              {appointments.data.totalCount === 1 ? '' : 's'}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={filters.page <= 1}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={filters.page >= totalPages}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      ) : null}

      <AdminAppointmentDetailPanel
        appointmentId={selected?.id ?? null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onCancel={() => {
          if (selected) setActionTarget({ appointment: selected, action: 'cancel' });
        }}
        onInvalidate={() => {
          if (selected) setActionTarget({ appointment: selected, action: 'invalidate' });
        }}
      />

      <AdminAppointmentActionDialog
        appointment={actionTarget?.appointment ?? null}
        action={actionTarget?.action ?? 'cancel'}
        onOpenChange={(open) => {
          if (!open) {
            setActionTarget(null);
            setSelected(null);
          }
        }}
      />
    </div>
  );
}
