'use client';

import { AppointmentStatus, type AdminAppointmentEvent } from '@doksabahay/shared';

import { PageError, PageLoading } from '@/components/page-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';

import { useAdminAppointment } from './use-admin-appointments';

function statusVariant(status: AppointmentStatus): 'default' | 'secondary' | 'destructive' {
  if (status === AppointmentStatus.SCHEDULED) return 'default';
  if (status === AppointmentStatus.COMPLETED) return 'secondary';
  return 'destructive';
}

const EVENT_LABELS: Record<AdminAppointmentEvent['type'], string> = {
  CREATED: 'Created',
  RESCHEDULED: 'Rescheduled',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  INVALIDATED: 'Invalidated',
};

/**
 * Sheet-based drawer: one appointment's metadata, session state and full
 * event timeline. Never shows clinical note/prescription content — the API
 * does not return any. Cancel/Invalidate trigger the action dialog above it.
 */
export function AdminAppointmentDetailPanel({
  appointmentId,
  onOpenChange,
  onCancel,
  onInvalidate,
}: {
  appointmentId: string | null;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onInvalidate: () => void;
}) {
  const detail = useAdminAppointment(appointmentId ?? undefined);
  const open = appointmentId !== null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-4 overflow-y-auto px-4 py-4 sm:max-w-lg">
        <SheetHeader className="p-0">
          <SheetTitle>Appointment detail</SheetTitle>
          <SheetDescription>Logistics and history only — no clinical content.</SheetDescription>
        </SheetHeader>

        {detail.isPending ? <PageLoading label="Loading appointment…" /> : null}
        {detail.isError ? (
          <PageError message={detail.error.message} onRetry={() => void detail.refetch()} />
        ) : null}

        {detail.data ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Patient</p>
                <p className="font-medium">
                  {detail.data.patient.firstName} {detail.data.patient.lastName}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Doctor</p>
                <p className="font-medium">
                  {detail.data.doctor.title} {detail.data.doctor.firstName} {detail.data.doctor.lastName}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Starts</p>
                <p className="font-medium">{new Date(detail.data.startAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Ends</p>
                <p className="font-medium">{new Date(detail.data.endAt).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p>
                  <Badge variant={statusVariant(detail.data.status)}>{detail.data.status}</Badge>
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Session</p>
                <p>
                  <Badge variant="outline">{detail.data.session.state}</Badge>
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground">Reason for visit</p>
                <p className="font-medium">{detail.data.reasonForVisit}</p>
              </div>
              {detail.data.cancellationReason ? (
                <div className="col-span-2">
                  <p className="text-muted-foreground">Cancellation / invalidation reason</p>
                  <p className="font-medium">{detail.data.cancellationReason}</p>
                </div>
              ) : null}
            </div>

            {detail.data.status === AppointmentStatus.SCHEDULED ? (
              <div className="flex gap-2 border-y py-3">
                <Button type="button" variant="destructive" size="sm" onClick={onCancel}>
                  Cancel
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={onInvalidate}>
                  Invalidate
                </Button>
              </div>
            ) : null}

            <div>
              <p className="mb-2 text-sm font-medium">Event timeline</p>
              <ol className="flex flex-col gap-2">
                {detail.data.events.map((event) => (
                  <li key={event.id} className="rounded-lg border p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{EVENT_LABELS[event.type]}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {event.fromStartAt && event.toStartAt ? (
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.fromStartAt).toLocaleString()} →{' '}
                        {new Date(event.toStartAt).toLocaleString()}
                      </p>
                    ) : null}
                    {event.reason ? <p className="text-xs text-muted-foreground">{event.reason}</p> : null}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
