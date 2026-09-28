'use client';

import type { AffectedAppointment } from '@doksabahay/shared';
import { Trash2 } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState } from 'react';

import { PageError, PageLoading } from '@/components/page-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  useAvailabilityExceptions,
  useCreateAvailabilityException,
  useDeleteAvailabilityException,
} from '../use-availability';
import { affectedAppointmentsFrom } from './schedule-conflict';

/**
 * List/add/remove editor for `AvailabilityException`s (one-off blocked
 * time). Uses native `datetime-local` inputs (no external date picker) and
 * converts to/from UTC with Luxon; deleting never needs a conflict check
 * (it only restores availability), but adding one does.
 */
export function ExceptionsEditor({
  onConflict,
}: {
  onConflict: (appointments: AffectedAppointment[]) => void;
}) {
  const exceptions = useAvailabilityExceptions();
  const createException = useCreateAvailabilityException();
  const deleteException = useDeleteAvailabilityException();
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const onAdd = (): void => {
    setFormError(null);
    if (!startAt || !endAt) {
      setFormError('Choose a start and end.');
      return;
    }
    const startIso = DateTime.fromISO(startAt).toUTC().toISO();
    const endIso = DateTime.fromISO(endAt).toUTC().toISO();
    if (!startIso || !endIso) {
      setFormError('Enter valid dates.');
      return;
    }
    createException.mutate(
      { startAt: startIso, endAt: endIso, ...(reason.trim() ? { reason: reason.trim() } : {}) },
      {
        onSuccess: () => {
          setStartAt('');
          setEndAt('');
          setReason('');
        },
        onError: (apiError) => {
          const appointments = affectedAppointmentsFrom(apiError);
          if (appointments) {
            onConflict(appointments);
            return;
          }
          setFormError(apiError.message);
        },
      },
    );
  };

  if (exceptions.isPending) {
    return <PageLoading label="Loading time off…" />;
  }
  if (exceptions.isError) {
    return (
      <PageError message={exceptions.error.message} onRetry={() => void exceptions.refetch()} />
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      {rowError ? <p className="text-sm text-destructive">{rowError}</p> : null}
      {exceptions.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">No time off scheduled.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {exceptions.data.map((exception) => (
            <li key={exception.id} className="flex items-center justify-between gap-2 text-sm">
              <span>
                {DateTime.fromISO(exception.startAt).toLocaleString(DateTime.DATETIME_MED)} –{' '}
                {DateTime.fromISO(exception.endAt).toLocaleString(DateTime.DATETIME_MED)}
                {exception.reason ? ` (${exception.reason})` : ''}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remove this time off"
                disabled={deleteException.isPending}
                onClick={() => {
                  setRowError(null);
                  deleteException.mutate(exception.id, {
                    onError: (apiError) => setRowError(apiError.message),
                  });
                }}
              >
                <Trash2 aria-hidden="true" className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Start
          <Input
            type="datetime-local"
            value={startAt}
            onChange={(event) => setStartAt(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          End
          <Input
            type="datetime-local"
            value={endAt}
            onChange={(event) => setEndAt(event.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Reason (optional)
          <Input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="w-48"
          />
        </label>
        <Button
          type="button"
          variant="outline"
          onClick={onAdd}
          disabled={createException.isPending}
        >
          {createException.isPending ? 'Adding…' : 'Add'}
        </Button>
      </div>
      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
    </div>
  );
}
