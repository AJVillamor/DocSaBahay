import { AppointmentStatus, PrismaClient, Role, VerificationStatus } from '@prisma/client';
import { DateTime } from 'luxon';

import { readAdminCredentials, seed } from '../prisma/seed';

const ADMIN = { adminEmail: 'Admin@Example.com', adminPassword: 'Admin-Password-1' };

/**
 * Runs the demo seed against db_test and checks the acceptance criteria:
 * idempotency, record counts, availability alignment and no overlaps.
 */
describe('prisma seed (db_test)', () => {
  const prisma = new PrismaClient();

  async function wipe(): Promise<void> {
    // Audit logs and notes restrict user deletion, so clear everything the seed touches.
    await prisma.$executeRawUnsafe(`
      TRUNCATE audit_logs, notifications, appointments, availability_exceptions,
        availability_rules, doctor_specializations, doctor_profiles, patient_profiles,
        refresh_tokens, users, matching_keywords, symptom_specialization_rules, symptoms,
        specializations CASCADE`);
  }

  async function countBy<K extends string>(
    values: readonly K[],
    count: (value: K) => Promise<number>,
  ): Promise<Record<K, number>> {
    const entries = await Promise.all(values.map(async (v) => [v, await count(v)] as const));
    return Object.fromEntries(entries) as Record<K, number>;
  }

  async function counts() {
    return {
      users: await countBy(Object.values(Role), (role) => prisma.user.count({ where: { role } })),
      doctors: await countBy(Object.values(VerificationStatus), (verificationStatus) =>
        prisma.doctorProfile.count({ where: { verificationStatus } }),
      ),
      patients: await prisma.patientProfile.count({ where: { profileCompleted: true } }),
      specializations: await prisma.specialization.count(),
      symptoms: await prisma.symptom.count(),
      keywords: await prisma.matchingKeyword.count(),
      appointments: await countBy(Object.values(AppointmentStatus), (status) =>
        prisma.appointment.count({ where: { status } }),
      ),
      notifications: await prisma.notification.count(),
      auditLogs: await prisma.auditLog.count(),
      notes: await prisma.consultationNote.count({ where: { status: 'FINALIZED' } }),
      prescriptions: await prisma.prescription.count({ where: { status: 'ISSUED' } }),
    };
  }

  beforeEach(wipe);

  afterAll(async () => {
    await wipe();
    await prisma.$disconnect();
  });

  // The second date's 14-day window crosses the US DST change (2030-03-10).
  it.each(['2030-01-15T03:00:00Z', '2030-03-05T20:30:00Z'])(
    'seeds the demo dataset idempotently (now = %s)',
    async (iso) => {
      const now = DateTime.fromISO(iso, { zone: 'utc' });

      await seed(prisma, { ...ADMIN, now });
      const first = await counts();
      await seed(prisma, { ...ADMIN, now });
      expect(await counts()).toEqual(first);

      expect(first).toMatchObject({
        users: { [Role.ADMIN]: 1, [Role.DOCTOR]: 12, [Role.PATIENT]: 5 },
        doctors: {
          [VerificationStatus.APPROVED]: 9,
          [VerificationStatus.PENDING]: 2,
          [VerificationStatus.REJECTED]: 1,
        },
        patients: 5,
        specializations: 11,
        appointments: {
          [AppointmentStatus.COMPLETED]: 10,
          [AppointmentStatus.CANCELLED]: 3,
          [AppointmentStatus.SCHEDULED]: 8,
        },
        notes: 10,
      });
      expect(first.symptoms).toBeGreaterThanOrEqual(30);
      expect(first.keywords).toBeGreaterThanOrEqual(60);
      expect(first.prescriptions).toBeGreaterThan(0);
      expect(first.notifications).toBeGreaterThan(0);
      expect(first.auditLogs).toBeGreaterThan(0);
      expect(await prisma.user.findUnique({ where: { email: 'admin@example.com' } })).toBeTruthy();

      await expectAppointmentsAlignedAndNonOverlapping(now);
    },
  );

  async function expectAppointmentsAlignedAndNonOverlapping(now: DateTime): Promise<void> {
    const appointments = await prisma.appointment.findMany({
      include: {
        doctor: {
          include: { doctorProfile: true, availabilityRules: true, availabilityExceptions: true },
        },
      },
      orderBy: { startAt: 'asc' },
    });

    for (const a of appointments) {
      const profile = a.doctor.doctorProfile;
      expect(profile?.verificationStatus).toBe(VerificationStatus.APPROVED);
      if (!profile) continue;

      const start = DateTime.fromJSDate(a.startAt).setZone(profile.timezone);
      const end = DateTime.fromJSDate(a.endAt).setZone(profile.timezone);
      expect(end.diff(start, 'minutes').minutes).toBe(profile.consultationMinutes);

      const within = a.doctor.availabilityRules.some(
        (r) =>
          r.dayOfWeek === start.weekday % 7 &&
          r.startTime <= start.toFormat('HH:mm') &&
          end.toFormat('HH:mm') <= r.endTime &&
          start.hasSame(end, 'day'),
      );
      expect({ id: a.id, within }).toEqual({ id: a.id, within: true });
      expect(
        a.doctor.availabilityExceptions.some((e) => e.startAt < a.endAt && a.startAt < e.endAt),
      ).toBe(false);

      if (a.status === AppointmentStatus.SCHEDULED) {
        expect(a.startAt > now.toJSDate()).toBe(true);
        expect(a.startAt <= now.plus({ days: 14 }).toJSDate()).toBe(true);
      } else {
        expect(a.endAt <= now.toJSDate()).toBe(true);
      }
    }

    // No overlaps per doctor or per patient, whatever the status.
    const overlapping = appointments.filter((a) =>
      appointments.some(
        (b) =>
          a.id !== b.id &&
          (a.doctorId === b.doctorId || a.patientId === b.patientId) &&
          a.startAt < b.endAt &&
          b.startAt < a.endAt,
      ),
    );
    expect(overlapping).toEqual([]);
  }
});

describe('readAdminCredentials', () => {
  it('fails with a clear message when ADMIN_EMAIL or ADMIN_PASSWORD is missing', () => {
    expect(() => readAdminCredentials({})).toThrow(
      'ADMIN_EMAIL and ADMIN_PASSWORD must be set to seed the admin account',
    );
    expect(() => readAdminCredentials({ ADMIN_EMAIL: 'admin@example.com' })).toThrow(
      /^ADMIN_PASSWORD must be set/,
    );
  });

  it('rejects an invalid email without echoing the values', () => {
    expect(() =>
      readAdminCredentials({ ADMIN_EMAIL: 'not-an-email', ADMIN_PASSWORD: 'secret-pw-123' }),
    ).toThrow(/^(?!.*secret-pw-123).*ADMIN_EMAIL must be a valid email address/);
  });
});
