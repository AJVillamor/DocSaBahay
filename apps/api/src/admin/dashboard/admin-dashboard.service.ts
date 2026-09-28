import { Injectable } from '@nestjs/common';
import type { AdminDashboard, CountBucket, DailyAppointmentCount } from '@doksabahay/shared';
import { DateTime } from 'luxon';

import { PrismaService } from '../../prisma/prisma.service';
import { AdminAppointmentIssuesService } from '../appointments/admin-appointment-issues.service';
import { AuditService } from '../audit/audit.service';

const RECENT_AUDIT_LIMIT = 10;
const DAILY_CHART_DAYS = 14;

/** Number of raw SQL rows the daily-count query returns, before zero-filling. */
interface DailyCountRow {
  day: Date;
  count: number;
}

/** Turns a `groupBy(..., _count: true)` result into the shared `{ key, count }` shape. */
function toBuckets<T extends Record<string, unknown>>(
  rows: (T & { _count: number })[],
  keyOf: (row: T) => string,
): CountBucket[] {
  return rows.map((row) => ({ key: keyOf(row), count: row._count }));
}

/**
 * Computes every figure `GET /admin/dashboard` returns. Every count is a live
 * DB aggregate (`groupBy`/`count`/a `date_trunc` raw query for the daily
 * chart) computed at request time — nothing here is fetched as full rows and
 * counted in application code, and nothing is cached.
 */
@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly issues: AdminAppointmentIssuesService,
  ) {}

  async getSummary(): Promise<AdminDashboard> {
    const now = DateTime.utc();
    const todayStart = now.startOf('day').toJSDate();
    const todayEnd = now.startOf('day').plus({ days: 1 }).toJSDate();
    const next7Start = now.toJSDate();
    const next7End = now.plus({ days: 7 }).toJSDate();
    const last30Start = now.minus({ days: 30 }).toJSDate();
    const last30End = now.toJSDate();

    const [
      usersByRoleStatusRows,
      doctorsByVerificationRows,
      appointmentsTodayRows,
      appointmentsNext7Rows,
      appointmentsLast30Rows,
      sessionsTodayRows,
      appointmentsPerDay,
      issues,
      recentAuditEntries,
    ] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role', 'status'], _count: true }),
      this.prisma.doctorProfile.groupBy({ by: ['verificationStatus'], _count: true }),
      this.prisma.appointment.groupBy({
        by: ['status'],
        _count: true,
        where: { startAt: { gte: todayStart, lt: todayEnd } },
      }),
      this.prisma.appointment.groupBy({
        by: ['status'],
        _count: true,
        where: { startAt: { gte: next7Start, lt: next7End } },
      }),
      this.prisma.appointment.groupBy({
        by: ['status'],
        _count: true,
        where: { startAt: { gte: last30Start, lt: last30End } },
      }),
      this.prisma.consultationSession.groupBy({
        by: ['state'],
        _count: true,
        where: { appointment: { startAt: { gte: todayStart, lt: todayEnd } } },
      }),
      this.dailyAppointmentCounts(now),
      this.issues.detect(),
      this.audit.recent(RECENT_AUDIT_LIMIT),
    ]);

    return {
      usersByRoleStatus: toBuckets(usersByRoleStatusRows, (row) => `${row.role}:${row.status}`),
      doctorsByVerificationStatus: toBuckets(doctorsByVerificationRows, (row) => row.verificationStatus),
      appointments: {
        today: toBuckets(appointmentsTodayRows, (row) => row.status),
        next7Days: toBuckets(appointmentsNext7Rows, (row) => row.status),
        last30Days: toBuckets(appointmentsLast30Rows, (row) => row.status),
      },
      sessionsTodayByState: toBuckets(sessionsTodayRows, (row) => row.state),
      appointmentsPerDay,
      openIssuesCount: issues.length,
      recentAuditEntries,
    };
  }

  /**
   * Appointments per UTC calendar day for the last {@link DAILY_CHART_DAYS}
   * days (oldest first), zero-filled for days with no appointments. Day
   * bucketing is a DB-side `date_trunc`, not `AppointmentStatus`-aware
   * counting done in JS — `$queryRaw` is used because Prisma's `groupBy`
   * cannot group by a truncated/derived expression, only existing columns.
   */
  private async dailyAppointmentCounts(now: DateTime): Promise<DailyAppointmentCount[]> {
    const rangeStart = now.startOf('day').minus({ days: DAILY_CHART_DAYS - 1 }).toJSDate();
    const rangeEnd = now.startOf('day').plus({ days: 1 }).toJSDate();

    const rows = await this.prisma.$queryRaw<DailyCountRow[]>`
      SELECT date_trunc('day', start_at) AS day, count(*)::int AS count
      FROM appointments
      WHERE start_at >= ${rangeStart} AND start_at < ${rangeEnd}
      GROUP BY day
      ORDER BY day
    `;
    const countByDay = new Map(rows.map((row) => [DateTime.fromJSDate(row.day, { zone: 'utc' }).toISODate(), row.count]));

    const days: DailyAppointmentCount[] = [];
    for (let i = 0; i < DAILY_CHART_DAYS; i++) {
      const date = now.startOf('day').minus({ days: DAILY_CHART_DAYS - 1 - i }).toISODate()!;
      days.push({ date, count: countByDay.get(date) ?? 0 });
    }
    return days;
  }
}
