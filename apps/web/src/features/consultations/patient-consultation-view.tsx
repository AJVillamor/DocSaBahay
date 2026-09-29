'use client';

import {
  AppointmentStatus,
  isWithinJoinWindow,
  SessionState,
  type ConsultationSession,
} from '@doksabahay/shared';

import { FormAlert } from '@/components/form/form-alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserAvatar } from '@/components/user-avatar';

import { ConsultationChatPanel } from './consultation-chat-panel';
import { useJoinConsultation } from './use-consultation';

/** Patient's side of the consultation workspace: doctor card, reason for visit, join control and chat. */
export function PatientConsultationView({
  session,
  connected,
}: {
  session: ConsultationSession;
  connected: boolean;
}) {
  const { appointment } = session;
  const join = useJoinConsultation();
  const alreadyJoined = session.patientJoinedAt !== null;
  const withinWindow = isWithinJoinWindow(appointment.startAt, appointment.endAt);
  const canJoin =
    appointment.status === AppointmentStatus.SCHEDULED &&
    session.state !== SessionState.COMPLETED &&
    withinWindow &&
    !alreadyJoined;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Your doctor</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <UserAvatar
            user={{ id: appointment.doctor.id, email: '', profile: appointment.doctor }}
            className="size-12 text-base"
          />
          <div>
            <p className="font-medium">
              Dr. {appointment.doctor.firstName} {appointment.doctor.lastName}
            </p>
            <p className="text-sm text-muted-foreground">{appointment.doctor.title}</p>
            {appointment.doctor.specializations.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-1">
                {appointment.doctor.specializations.map((s) => (
                  <Badge key={s.name} variant="secondary">
                    {s.name}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reason for visit</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm break-words">{appointment.reasonForVisit}</p>
        </CardContent>
      </Card>

      {join.error ? <FormAlert>{join.error.message}</FormAlert> : null}

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          size="lg"
          disabled={!canJoin || join.isPending}
          onClick={() => join.mutate(appointment.id)}
        >
          {alreadyJoined
            ? 'Waiting for the doctor to start…'
            : join.isPending
              ? 'Joining…'
              : 'Join consultation'}
        </Button>
        <p className="text-xs text-muted-foreground">
          This is a fictional prototype — there is no audio or video call here. Use this page to
          check in and, once your notes and prescription are ready, view them here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <ConsultationChatPanel
            appointmentId={appointment.id}
            sessionState={session.state}
            connected={connected}
          />
        </CardContent>
      </Card>
    </div>
  );
}
