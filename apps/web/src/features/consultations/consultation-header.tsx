'use client';

import { SessionState, type ConsultationSession } from '@doksabahay/shared';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import type { Presence } from './use-consultation-room';

const STEPS: { state: SessionState; label: string }[] = [
  { state: SessionState.SCHEDULED, label: 'Scheduled' },
  { state: SessionState.JOINED, label: 'Joined' },
  { state: SessionState.IN_PROGRESS, label: 'In progress' },
  { state: SessionState.COMPLETED, label: 'Completed' },
];

const STEP_INDEX: Record<SessionState, number> = {
  [SessionState.SCHEDULED]: 0,
  [SessionState.JOINED]: 1,
  [SessionState.IN_PROGRESS]: 2,
  [SessionState.COMPLETED]: 3,
};

/** Re-renders every 30s so the countdown below stays roughly live without polling the API for it. */
function useNow(intervalMs: number): DateTime {
  const [now, setNow] = useState(() => DateTime.now());
  useEffect(() => {
    const id = setInterval(() => setNow(DateTime.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function StatusTimeline({ state }: { state: SessionState }) {
  const currentIndex = STEP_INDEX[state];
  return (
    <ol className="flex items-center gap-2" aria-label="Consultation status">
      {STEPS.map((step, index) => (
        <li key={step.state} className="flex items-center gap-2">
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              index < currentIndex && 'bg-primary/15 text-primary',
              index === currentIndex && 'bg-primary text-primary-foreground',
              index > currentIndex && 'bg-muted text-muted-foreground',
            )}
            aria-current={index === currentIndex ? 'step' : undefined}
          >
            {step.label}
          </span>
          {index < STEPS.length - 1 ? (
            <span aria-hidden="true" className="h-px w-4 bg-border sm:w-8" />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function PresenceDot({ online, label }: { online: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        aria-hidden="true"
        className={cn('size-2 rounded-full', online ? 'bg-emerald-600' : 'bg-muted-foreground/40')}
      />
      {label} {online ? 'online' : 'offline'}
    </span>
  );
}

/** Countdown text to `startAt`, or null once the join window has opened (nothing left to count down to). */
function useCountdownLabel(startAt: string): string | null {
  const now = useNow(30_000);
  const start = DateTime.fromISO(startAt);
  const diff = start.diff(now, ['hours', 'minutes']).shiftTo('hours', 'minutes');
  if (diff.toMillis() <= 0) {
    return null;
  }
  const hours = Math.floor(diff.hours);
  const minutes = Math.floor(diff.minutes);
  return hours > 0 ? `Starts in ${hours}h ${minutes}m` : `Starts in ${minutes}m`;
}

/**
 * Shared header for the consultation workspace: status timeline, a countdown
 * to `startAt` while not yet started, and live presence dots for both
 * participants.
 */
export function ConsultationHeader({
  session,
  presence,
}: {
  session: ConsultationSession;
  presence: Presence;
}) {
  const countdown = useCountdownLabel(session.appointment.startAt);
  const patientOnline = presence[session.appointment.patient.id] ?? false;
  const doctorOnline = presence[session.appointment.doctor.id] ?? false;

  return (
    <div className="flex flex-col gap-3 border-b pb-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusTimeline state={session.state} />
        {session.state === SessionState.SCHEDULED && countdown ? (
          <span className="text-sm text-muted-foreground">{countdown}</span>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <PresenceDot online={patientOnline} label="Patient" />
        <PresenceDot online={doctorOnline} label="Doctor" />
      </div>
    </div>
  );
}
