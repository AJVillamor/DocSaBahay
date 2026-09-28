import { BOOKING_HORIZON_DAYS, LEAD_TIME_MINUTES } from '@doksabahay/shared';
import { DateTime } from 'luxon';

import { computeFreeSlots, type Slot, type WeeklyRule } from './slot-engine';

const ZONE = 'Asia/Manila'; // No DST, keeps the non-DST tests simple.

/** Local wall-clock instant, as a JS `Date`, without manual UTC offset math. */
function local(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return DateTime.fromObject({ year, month, day, hour, minute }, { zone: ZONE }).toJSDate();
}

/** The 0–6 (Sunday–Saturday) day-of-week for a local calendar day, computed the same way the engine does. */
function dayOfWeekOf(year: number, month: number, day: number): number {
  return DateTime.fromObject({ year, month, day }, { zone: ZONE }).weekday % 7;
}

const isoStarts = (slots: Slot[]): string[] => slots.map((s) => s.startAt.toISOString());

describe('computeFreeSlots', () => {
  // An arbitrary Monday; the exact date does not matter, only its day-of-week.
  const DAY = { year: 2026, month: 6, day: 15 } as const;
  const dow = dayOfWeekOf(DAY.year, DAY.month, DAY.day);
  const dayStart = local(DAY.year, DAY.month, DAY.day);
  const dayEnd = local(DAY.year, DAY.month, DAY.day + 1);

  const baseInput = {
    timezone: ZONE,
    consultationMinutes: 60,
    exceptions: [],
    bookedAppointments: [],
    from: dayStart,
    to: dayEnd,
    now: local(2026, 1, 1),
    leadTimeMinutes: 0,
    horizonDays: 365,
  };

  it('generates one slot per consultationMinutes step within a normal day', () => {
    const rules: WeeklyRule[] = [{ dayOfWeek: dow, startTime: '09:00', endTime: '12:00' }];

    const slots = computeFreeSlots({ ...baseInput, rules });

    expect(isoStarts(slots)).toEqual([
      local(DAY.year, DAY.month, DAY.day, 9).toISOString(),
      local(DAY.year, DAY.month, DAY.day, 10).toISOString(),
      local(DAY.year, DAY.month, DAY.day, 11).toISOString(),
    ]);
    expect(slots.map((s) => s.endAt.toISOString())).toEqual([
      local(DAY.year, DAY.month, DAY.day, 10).toISOString(),
      local(DAY.year, DAY.month, DAY.day, 11).toISOString(),
      local(DAY.year, DAY.month, DAY.day, 12).toISOString(),
    ]);
  });

  it('excludes a slot carved out by an availability exception', () => {
    const rules: WeeklyRule[] = [{ dayOfWeek: dow, startTime: '09:00', endTime: '12:00' }];
    const exceptions = [
      {
        startAt: local(DAY.year, DAY.month, DAY.day, 10),
        endAt: local(DAY.year, DAY.month, DAY.day, 11),
      },
    ];

    const slots = computeFreeSlots({ ...baseInput, rules, exceptions });

    expect(isoStarts(slots)).toEqual([
      local(DAY.year, DAY.month, DAY.day, 9).toISOString(),
      local(DAY.year, DAY.month, DAY.day, 11).toISOString(),
    ]);
  });

  it('excludes a slot already covered by a SCHEDULED appointment', () => {
    const rules: WeeklyRule[] = [{ dayOfWeek: dow, startTime: '09:00', endTime: '12:00' }];
    const bookedAppointments = [
      {
        startAt: local(DAY.year, DAY.month, DAY.day, 9),
        endAt: local(DAY.year, DAY.month, DAY.day, 10),
      },
    ];

    const slots = computeFreeSlots({ ...baseInput, rules, bookedAppointments });

    expect(isoStarts(slots)).toEqual([
      local(DAY.year, DAY.month, DAY.day, 10).toISOString(),
      local(DAY.year, DAY.month, DAY.day, 11).toISOString(),
    ]);
  });

  it('excludes a slot that starts less than LEAD_TIME_MINUTES from now', () => {
    const rules: WeeklyRule[] = [{ dayOfWeek: dow, startTime: '09:00', endTime: '12:00' }];
    const slot9 = local(DAY.year, DAY.month, DAY.day, 9);
    const now = new Date(slot9.getTime() - 30 * 60_000); // 30 min before the 9:00 slot.

    const slots = computeFreeSlots({
      ...baseInput,
      rules,
      now,
      leadTimeMinutes: LEAD_TIME_MINUTES,
    });

    // 9:00 is only 30 min away (< 60 min lead time) and must not appear; 10:00 and 11:00 are fine.
    expect(isoStarts(slots)).toEqual([
      local(DAY.year, DAY.month, DAY.day, 10).toISOString(),
      local(DAY.year, DAY.month, DAY.day, 11).toISOString(),
    ]);
  });

  it('excludes a slot more than BOOKING_HORIZON_DAYS from now, but keeps one within it', () => {
    const now = local(DAY.year, DAY.month, DAY.day);
    const nearDay = { year: 2026, month: 8, day: 4 }; // 50 days after the base day.
    const farDay = { year: 2026, month: 8, day: 24 }; // 70 days after the base day.
    const rules: WeeklyRule[] = [
      {
        dayOfWeek: dayOfWeekOf(nearDay.year, nearDay.month, nearDay.day),
        startTime: '09:00',
        endTime: '10:00',
      },
      {
        dayOfWeek: dayOfWeekOf(farDay.year, farDay.month, farDay.day),
        startTime: '09:00',
        endTime: '10:00',
      },
    ];

    const slots = computeFreeSlots({
      ...baseInput,
      rules,
      now,
      leadTimeMinutes: 0,
      horizonDays: BOOKING_HORIZON_DAYS,
      from: local(nearDay.year, nearDay.month, nearDay.day),
      to: local(farDay.year, farDay.month, farDay.day + 1),
    });

    expect(isoStarts(slots)).toEqual([
      local(nearDay.year, nearDay.month, nearDay.day, 9).toISOString(),
    ]);
  });

  it('lands rule times on the correct wall clock across a DST transition (America/New_York)', () => {
    const zone = 'America/New_York';
    // US DST 2026: clocks spring forward Sunday 8 March, 02:00 -> 03:00.
    const saturday = { year: 2026, month: 3, day: 7 }; // last day of EST (UTC-5)
    const sunday = { year: 2026, month: 3, day: 8 }; // first day of EDT (UTC-4) by 09:00

    const rules: WeeklyRule[] = [
      { dayOfWeek: 6, startTime: '09:00', endTime: '11:00' }, // Saturday
      { dayOfWeek: 0, startTime: '09:00', endTime: '11:00' }, // Sunday
    ];

    const slots = computeFreeSlots({
      timezone: zone,
      consultationMinutes: 60,
      rules,
      exceptions: [],
      bookedAppointments: [],
      from: DateTime.fromObject({ ...saturday, hour: 0 }, { zone }).toJSDate(),
      to: DateTime.fromObject({ year: 2026, month: 3, day: 9, hour: 0 }, { zone }).toJSDate(),
      now: DateTime.fromObject({ year: 2026, month: 1, day: 1 }, { zone }).toJSDate(),
      leadTimeMinutes: 0,
      horizonDays: 365,
    });

    const saturdayNine = slots.find(
      (s) => DateTime.fromJSDate(s.startAt, { zone }).day === saturday.day,
    );
    const sundayNine = slots.find(
      (s) => DateTime.fromJSDate(s.startAt, { zone }).day === sunday.day,
    );

    expect(saturdayNine).toBeDefined();
    expect(sundayNine).toBeDefined();
    expect(saturdayNine?.startAt.toISOString()).toBe('2026-03-07T14:00:00.000Z'); // 09:00 EST = 14:00 UTC
    expect(sundayNine?.startAt.toISOString()).toBe('2026-03-08T13:00:00.000Z'); // 09:00 EDT = 13:00 UTC

    // Both land on the same 09:00–10:00 local wall clock, one hour apart in UTC.
    const saturdayLocal = saturdayNine ? DateTime.fromJSDate(saturdayNine.startAt, { zone }) : null;
    const sundayLocal = sundayNine ? DateTime.fromJSDate(sundayNine.startAt, { zone }) : null;
    expect(saturdayLocal?.toFormat('HH:mm')).toBe('09:00');
    expect(sundayLocal?.toFormat('HH:mm')).toBe('09:00');
  });
});
