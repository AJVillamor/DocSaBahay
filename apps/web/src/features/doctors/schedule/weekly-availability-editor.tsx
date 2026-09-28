'use client';

import type { AffectedAppointment } from '@doksabahay/shared';
import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import { PageError, PageLoading } from '@/components/page-state';
import { Button } from '@/components/ui/button';

import {
  useAvailabilityRules,
  useCreateAvailabilityRule,
  useDeleteAvailabilityRule,
} from '../use-availability';
import { affectedAppointmentsFrom } from './schedule-conflict';

const DAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

const timeInputClassName =
  'h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50';

function AddRuleRow({
  dayOfWeek,
  onConflict,
}: {
  dayOfWeek: number;
  onConflict: (appointments: AffectedAppointment[]) => void;
}) {
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [error, setError] = useState<string | null>(null);
  const createRule = useCreateAvailabilityRule();

  const onAdd = (): void => {
    setError(null);
    createRule.mutate(
      { dayOfWeek, startTime, endTime },
      {
        onError: (apiError) => {
          const appointments = affectedAppointmentsFrom(apiError);
          if (appointments) {
            onConflict(appointments);
            return;
          }
          setError(apiError.message);
        },
      },
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="sr-only" htmlFor={`start-${dayOfWeek}`}>
        {DAY_LABELS[dayOfWeek]} start time
      </label>
      <input
        id={`start-${dayOfWeek}`}
        type="time"
        step={900}
        value={startTime}
        onChange={(event) => setStartTime(event.target.value)}
        className={timeInputClassName}
      />
      <span className="text-sm text-muted-foreground">to</span>
      <label className="sr-only" htmlFor={`end-${dayOfWeek}`}>
        {DAY_LABELS[dayOfWeek]} end time
      </label>
      <input
        id={`end-${dayOfWeek}`}
        type="time"
        step={900}
        value={endTime}
        onChange={(event) => setEndTime(event.target.value)}
        className={timeInputClassName}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={onAdd}
        disabled={createRule.isPending}
      >
        {createRule.isPending ? 'Adding…' : 'Add'}
      </Button>
      {error ? <p className="w-full text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

/**
 * Per-weekday add/remove editor for `AvailabilityRule`s. Times are on a
 * 15-minute step (also enforced by the API); overlaps and conflicts with
 * booked appointments are rejected by the API and surfaced here.
 */
export function WeeklyAvailabilityEditor({
  onConflict,
}: {
  onConflict: (appointments: AffectedAppointment[]) => void;
}) {
  const rules = useAvailabilityRules();
  const deleteRule = useDeleteAvailabilityRule();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  if (rules.isPending) {
    return <PageLoading label="Loading your availability…" />;
  }
  if (rules.isError) {
    return <PageError message={rules.error.message} onRetry={() => void rules.refetch()} />;
  }

  const data = rules.data;

  return (
    <div className="flex flex-col gap-4">
      {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
      {DAY_LABELS.map((label, day) => {
        const dayRules = data.filter((rule) => rule.dayOfWeek === day);
        return (
          <div key={day} className="flex flex-col gap-2 rounded-lg border p-4">
            <h3 className="font-medium">{label}</h3>
            {dayRules.length === 0 ? (
              <p className="text-sm text-muted-foreground">No availability.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {dayRules.map((rule) => (
                  <li key={rule.id} className="flex items-center justify-between gap-2 text-sm">
                    <span>
                      {rule.startTime}–{rule.endTime}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${label} ${rule.startTime}–${rule.endTime}`}
                      disabled={deleteRule.isPending}
                      onClick={() => {
                        setDeleteError(null);
                        deleteRule.mutate(rule.id, {
                          onError: (apiError) => {
                            const appointments = affectedAppointmentsFrom(apiError);
                            if (appointments) {
                              onConflict(appointments);
                              return;
                            }
                            setDeleteError(apiError.message);
                          },
                        });
                      }}
                    >
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
            <AddRuleRow dayOfWeek={day} onConflict={onConflict} />
          </div>
        );
      })}
    </div>
  );
}
