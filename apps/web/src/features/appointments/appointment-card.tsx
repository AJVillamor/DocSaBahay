import { AppointmentStatus, isWithinJoinWindow, type Appointment } from '@doksabahay/shared';
import { DateTime } from 'luxon';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { avatarColor } from '@/lib/avatar';

function initialsOf(person: { firstName: string; lastName: string }): string {
  const letters = `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();
  return letters || '?';
}

function statusLabel(appointment: Appointment): string {
  if (appointment.status === AppointmentStatus.CANCELLED) {
    return appointment.cancellationReason
      ? `Cancelled — ${appointment.cancellationReason}`
      : 'Cancelled';
  }
  const label = appointment.status.toLowerCase();
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** One appointment row, shared by the patient's and doctor's appointment lists. */
export function AppointmentCard({
  appointment,
  viewer,
  onReschedule,
  onCancel,
}: {
  appointment: Appointment;
  viewer: 'PATIENT' | 'DOCTOR';
  onReschedule?: () => void;
  onCancel?: () => void;
}) {
  const other = viewer === 'PATIENT' ? appointment.doctor : appointment.patient;
  const name =
    viewer === 'PATIENT'
      ? `Dr. ${appointment.doctor.firstName} ${appointment.doctor.lastName}`
      : `${appointment.patient.firstName} ${appointment.patient.lastName}`;
  const canManage =
    appointment.status === AppointmentStatus.SCHEDULED &&
    new Date(appointment.startAt) > new Date();
  const canJoinConsultation =
    appointment.status === AppointmentStatus.SCHEDULED &&
    isWithinJoinWindow(appointment.startAt, appointment.endAt);

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span
          aria-hidden="true"
          className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white ${avatarColor(other.id)}`}
        >
          {initialsOf(other)}
        </span>
        <div className="min-w-0">
          <p className="font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">
            {DateTime.fromISO(appointment.startAt).toLocaleString(DateTime.DATETIME_MED)}
          </p>
          <p className="mt-1 text-sm break-words">{appointment.reasonForVisit}</p>
          {appointment.status !== AppointmentStatus.SCHEDULED ? (
            <Badge variant="secondary" className="mt-2">
              {statusLabel(appointment)}
            </Badge>
          ) : null}
          {canJoinConsultation ? (
            <div className="mt-2">
              <Link href={`/consultations/${appointment.id}`} className={buttonVariants({ size: 'sm' })}>
                Join consultation
              </Link>
            </div>
          ) : null}
        </div>
      </div>
      {canManage && (onReschedule ?? onCancel) ? (
        <div className="flex shrink-0 gap-2">
          {onReschedule ? (
            <Button type="button" variant="outline" size="sm" onClick={onReschedule}>
              Reschedule
            </Button>
          ) : null}
          {onCancel ? (
            <Button type="button" variant="destructive" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
