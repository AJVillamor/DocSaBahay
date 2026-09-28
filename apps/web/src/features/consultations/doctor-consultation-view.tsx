'use client';

import {
  AppointmentStatus,
  CONSULTATION_NO_SHOW_GRACE_MINUTES,
  isWithinJoinWindow,
  SessionState,
  type ConsultationSession,
} from '@doksabahay/shared';
import { DateTime } from 'luxon';

import { FormAlert } from '@/components/form/form-alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { ClinicalRecordsPanel } from './clinical-records-panel';
import {
  useCompleteConsultation,
  useJoinConsultation,
  useReportNoShow,
  useStartConsultation,
} from './use-consultation';

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium break-words">{value}</dd>
    </div>
  );
}

/**
 * Doctor's side of the consultation workspace: patient summary, reason for
 * visit, join/start/complete controls, a no-show action, and the notes &
 * prescription panel (`ClinicalRecordsPanel`).
 */
export function DoctorConsultationView({ session }: { session: ConsultationSession }) {
  const { appointment, patientSummary } = session;
  const join = useJoinConsultation();
  const start = useStartConsultation();
  const complete = useCompleteConsultation();
  const noShow = useReportNoShow();

  const isScheduledAppointment = appointment.status === AppointmentStatus.SCHEDULED;
  const withinWindow = isWithinJoinWindow(appointment.startAt, appointment.endAt);
  const doctorJoined = session.doctorJoinedAt !== null;
  const canJoin =
    isScheduledAppointment && session.state !== SessionState.COMPLETED && withinWindow && !doctorJoined;
  const canStart =
    isScheduledAppointment &&
    session.state === SessionState.JOINED &&
    session.patientJoinedAt !== null &&
    session.doctorJoinedAt !== null;
  const canComplete = isScheduledAppointment && session.state === SessionState.IN_PROGRESS;
  const noShowEligible =
    isScheduledAppointment &&
    session.patientJoinedAt === null &&
    DateTime.now() >=
      DateTime.fromISO(appointment.startAt).plus({ minutes: CONSULTATION_NO_SHOW_GRACE_MINUTES });

  const mutationError = join.error ?? start.error ?? complete.error ?? noShow.error;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Reason for visit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm break-words">{appointment.reasonForVisit}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Patient summary</CardTitle>
          </CardHeader>
          <CardContent>
            {patientSummary ? (
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <SummaryField
                  label="Age"
                  value={patientSummary.age !== null ? `${patientSummary.age} years` : 'Not on file'}
                />
                <SummaryField
                  label="Weight / height"
                  value={
                    patientSummary.weightKg !== null && patientSummary.heightCm !== null
                      ? `${patientSummary.weightKg} kg / ${patientSummary.heightCm} cm`
                      : 'Not on file'
                  }
                />
                <SummaryField label="Allergies" value={patientSummary.allergies ?? 'None on file'} />
                <SummaryField
                  label="Chronic conditions"
                  value={patientSummary.chronicConditions ?? 'None on file'}
                />
                <SummaryField
                  label="Current medications"
                  value={patientSummary.currentMedications ?? 'None on file'}
                />
                <SummaryField
                  label="Consultation history"
                  value={
                    patientSummary.previousCompletedConsultations > 0
                      ? `${patientSummary.previousCompletedConsultations} previous completed consultation(s) with you`
                      : 'No previous consultations with you'
                  }
                />
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">No patient summary available.</p>
            )}
          </CardContent>
        </Card>

        {mutationError ? <FormAlert>{mutationError.message}</FormAlert> : null}

        <div className="flex flex-wrap gap-2">
          {!doctorJoined ? (
            <Button type="button" disabled={!canJoin || join.isPending} onClick={() => join.mutate(appointment.id)}>
              {join.isPending ? 'Joining…' : 'Join consultation'}
            </Button>
          ) : null}
          <Button type="button" disabled={!canStart || start.isPending} onClick={() => start.mutate(appointment.id)}>
            {start.isPending ? 'Starting…' : 'Start consultation'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canComplete || complete.isPending}
            onClick={() => complete.mutate(appointment.id)}
          >
            {complete.isPending ? 'Completing…' : 'Complete consultation'}
          </Button>
          {isScheduledAppointment && session.patientJoinedAt === null ? (
            <Button
              type="button"
              variant="destructive"
              disabled={!noShowEligible || noShow.isPending}
              title={
                noShowEligible
                  ? undefined
                  : `Available ${CONSULTATION_NO_SHOW_GRACE_MINUTES} minutes after the scheduled start if the patient hasn't joined.`
              }
              onClick={() => noShow.mutate(appointment.id)}
            >
              {noShow.isPending ? 'Reporting…' : 'Report patient no-show'}
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notes & prescription</CardTitle>
        </CardHeader>
        <CardContent>
          <ClinicalRecordsPanel appointmentId={appointment.id} sessionState={session.state} />
        </CardContent>
      </Card>
    </div>
  );
}
