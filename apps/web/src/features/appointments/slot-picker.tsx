'use client';

import type { Slot } from '@doksabahay/shared';
import { DateTime } from 'luxon';
import { useState } from 'react';

import { PageError, PageLoading } from '@/components/page-state';
import { Button } from '@/components/ui/button';
import { useDoctorSlots } from '@/features/doctors/use-slots';
import { cn } from '@/lib/utils';

const DAYS_AHEAD = 14;

/** Local calendar days, from today, `DAYS_AHEAD` of them (browser timezone). */
function buildDayStrip(): DateTime[] {
  const today = DateTime.local().startOf('day');
  return Array.from({ length: DAYS_AHEAD }, (_unused, index) => today.plus({ days: index }));
}

/**
 * Date strip (next 14 days) + a grid of that day's free slots, converted to
 * the browser's local timezone for display (the API returns UTC instants).
 * Reused by both the booking flow and the reschedule dialog.
 */
export function SlotPicker({
  doctorId,
  selected,
  onSelect,
}: {
  doctorId: string;
  selected: string | null;
  onSelect: (slot: Slot) => void;
}) {
  const [days] = useState(buildDayStrip);
  const [manualDayIndex, setManualDayIndex] = useState<number | null>(null);

  const firstDay = days[0] ?? DateTime.local().startOf('day');
  const lastDay = days[days.length - 1] ?? firstDay;
  const from = firstDay.toUTC().toISO() ?? '';
  const to = lastDay.plus({ days: 1 }).toUTC().toISO() ?? '';
  const slots = useDoctorSlots(doctorId, from, to);

  if (slots.isPending) {
    return <PageLoading label="Loading available times…" />;
  }
  if (slots.isError) {
    return <PageError message={slots.error.message} onRetry={() => void slots.refetch()} />;
  }

  const countForDay = (day: DateTime): number =>
    slots.data.filter((slot) => DateTime.fromISO(slot.startAt).hasSame(day, 'day')).length;

  const firstAvailableIndex = days.findIndex((day) => countForDay(day) > 0);
  const activeIndex = manualDayIndex ?? (firstAvailableIndex === -1 ? 0 : firstAvailableIndex);
  const activeDay = days[activeIndex] ?? firstDay;
  const daySlots = slots.data.filter((slot) => DateTime.fromISO(slot.startAt).hasSame(activeDay, 'day'));

  if (slots.data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No free times in the next {DAYS_AHEAD} days. Please check back later.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        role="tablist"
        aria-label="Choose a date"
        className="flex gap-2 overflow-x-auto pb-1"
      >
        {days.map((day, index) => {
          const count = countForDay(day);
          const isActive = index === activeIndex;
          return (
            <button
              key={day.toISODate()}
              type="button"
              role="tab"
              aria-selected={isActive}
              disabled={count === 0}
              onClick={() => setManualDayIndex(index)}
              className={cn(
                'flex shrink-0 flex-col items-center rounded-lg border px-3 py-2 text-sm transition-colors',
                isActive ? 'border-primary bg-primary/10 font-medium' : 'border-border',
                count === 0 && 'opacity-40',
              )}
            >
              <span className="text-xs text-muted-foreground">{day.toFormat('ccc')}</span>
              <span>{day.toFormat('d')}</span>
            </button>
          );
        })}
      </div>

      {daySlots.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No free times on this day. Pick another date above.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {daySlots.map((slot) => (
            <Button
              key={slot.startAt}
              type="button"
              size="sm"
              variant={selected === slot.startAt ? 'default' : 'outline'}
              aria-pressed={selected === slot.startAt}
              onClick={() => onSelect(slot)}
            >
              {DateTime.fromISO(slot.startAt).toFormat('h:mm a')}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
