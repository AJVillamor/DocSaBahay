'use client';

import type { AdminAppointmentIssueType, AdminAppointmentSummary } from '@doksabahay/shared';
import { useState } from 'react';

import { PageError, PageLoading } from '@/components/page-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { AdminAppointmentActionDialog, type AdminAppointmentActionKind } from './admin-appointment-action-dialog';
import { useAdminAppointmentIssues } from './use-admin-appointments';

const ISSUE_LABELS: Record<AdminAppointmentIssueType, { title: string; description: string }> = {
  DOCTOR_NOT_BOOKABLE: {
    title: 'Doctor no longer bookable',
    description: 'The doctor is no longer APPROVED and ACTIVE, though they were when this was booked.',
  },
  PATIENT_INACTIVE: {
    title: 'Patient no longer active',
    description: "The patient's account is suspended or deactivated.",
  },
  OUTSIDE_AVAILABILITY: {
    title: 'Outside current availability',
    description: "The appointment's time no longer falls inside the doctor's current schedule.",
  },
  STALE_UNSTARTED: {
    title: 'Stale — never started',
    description: 'More than 30 minutes have passed the end time and the session never started.',
  },
};

const ISSUE_ORDER: AdminAppointmentIssueType[] = [
  'DOCTOR_NOT_BOOKABLE',
  'PATIENT_INACTIVE',
  'OUTSIDE_AVAILABILITY',
  'STALE_UNSTARTED',
];

/** `/admin/appointments/issues`: SCHEDULED appointments flagged invalid, grouped by why. */
export function AdminAppointmentIssuesPage() {
  const issues = useAdminAppointmentIssues();
  const [actionTarget, setActionTarget] = useState<{
    appointment: AdminAppointmentSummary;
    action: AdminAppointmentActionKind;
  } | null>(null);

  const grouped = new Map<AdminAppointmentIssueType, AdminAppointmentSummary[]>();
  for (const issue of issues.data?.items ?? []) {
    const list = grouped.get(issue.issueType) ?? [];
    list.push(issue.appointment);
    grouped.set(issue.issueType, list);
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Appointment issues</h1>
        <p className="text-muted-foreground">
          SCHEDULED appointments that have become invalid since they were booked.
        </p>
      </div>

      {issues.isPending ? <PageLoading label="Checking appointments…" /> : null}
      {issues.isError ? (
        <PageError message={issues.error.message} onRetry={() => void issues.refetch()} />
      ) : null}

      {issues.data && issues.data.items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
          <p className="font-medium">No open issues</p>
          <p className="text-sm text-muted-foreground">Every SCHEDULED appointment currently checks out.</p>
        </div>
      ) : null}

      {issues.data && issues.data.items.length > 0 ? (
        <div className="flex flex-col gap-6">
          {ISSUE_ORDER.filter((issueType) => grouped.has(issueType)).map((issueType) => {
            const appointmentsForIssue = grouped.get(issueType)!;
            const copy = ISSUE_LABELS[issueType];
            return (
              <Card key={issueType}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {copy.title}
                    <Badge variant="destructive">{appointmentsForIssue.length}</Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{copy.description}</p>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] text-left text-sm">
                      <thead className="border-y bg-muted/40 text-xs text-muted-foreground uppercase">
                        <tr>
                          <th className="px-4 py-2 font-medium">Starts</th>
                          <th className="px-4 py-2 font-medium">Patient</th>
                          <th className="px-4 py-2 font-medium">Doctor</th>
                          <th className="px-4 py-2 font-medium" />
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {appointmentsForIssue.map((appointment) => (
                          <tr key={appointment.id} className="hover:bg-muted/30">
                            <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                              {new Date(appointment.startAt).toLocaleString()}
                            </td>
                            <td className="px-4 py-2">
                              {appointment.patient.firstName} {appointment.patient.lastName}
                            </td>
                            <td className="px-4 py-2">
                              {appointment.doctor.title} {appointment.doctor.firstName}{' '}
                              {appointment.doctor.lastName}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setActionTarget({ appointment, action: 'cancel' })}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setActionTarget({ appointment, action: 'invalidate' })}
                                >
                                  Invalidate
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : null}

      <AdminAppointmentActionDialog
        appointment={actionTarget?.appointment ?? null}
        action={actionTarget?.action ?? 'cancel'}
        onOpenChange={(open) => {
          if (!open) setActionTarget(null);
        }}
      />
    </div>
  );
}
