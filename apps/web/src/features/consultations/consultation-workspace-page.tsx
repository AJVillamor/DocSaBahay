'use client';

import { Role } from '@doksabahay/shared';

import { PageError, PageLoading } from '@/components/page-state';
import { useAuth } from '@/features/auth/use-auth';

import { ConsultationHeader } from './consultation-header';
import { DoctorConsultationView } from './doctor-consultation-view';
import { PatientConsultationView } from './patient-consultation-view';
import { useConsultationRoom } from './use-consultation-room';
import { useConsultation } from './use-consultation';

/**
 * `/consultations/:appointmentId`: the text/data-only consultation workspace,
 * shared by both roles (no role-prefixed route — see `apps/web/src/app/notifications`
 * for the same pattern) and rendered differently based on the signed-in
 * user's role. There is no audio/video in this prototype.
 */
export function ConsultationWorkspacePage({ appointmentId }: { appointmentId: string }) {
  const { user } = useAuth();
  const room = useConsultationRoom(appointmentId);
  const consultation = useConsultation(appointmentId, !room.connected);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8 lg:px-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Consultation</h1>
        <p className="text-muted-foreground">
          Fictional prototype — not for real medical use. No audio or video call.
        </p>
      </div>

      {consultation.isPending ? <PageLoading label="Loading consultation…" /> : null}
      {consultation.isError ? (
        <PageError message={consultation.error.message} onRetry={() => void consultation.refetch()} />
      ) : null}

      {consultation.data && user ? (
        <div className="flex flex-col gap-6">
          <ConsultationHeader session={consultation.data} presence={room.presence} />
          {user.role === Role.DOCTOR ? (
            <DoctorConsultationView session={consultation.data} connected={room.connected} />
          ) : (
            <PatientConsultationView session={consultation.data} connected={room.connected} />
          )}
        </div>
      ) : null}
    </div>
  );
}
