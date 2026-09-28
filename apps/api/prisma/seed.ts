import {
  AppointmentEventType,
  AppointmentStatus,
  NoteStatus,
  NotificationType,
  Prisma,
  PrismaClient,
  PrescriptionStatus,
  Role,
  SessionState,
  VerificationStatus,
} from '@prisma/client';
import { hash } from 'argon2';
import { DateTime } from 'luxon';
import { z } from 'zod';

import { APPOINTMENTS, type AppointmentSeed } from './seed-data/appointments';
import { KEYWORDS, SPECIALIZATIONS, SYMPTOMS, type SpecializationSlug } from './seed-data/catalog';
import { seedId } from './seed-data/ids';
import {
  DEMO_PASSWORD,
  DOCTORS,
  PATIENTS,
  fakeLicenseNumber,
  type DoctorKey,
  type PatientKey,
} from './seed-data/people';
import { SlotScheduler, type DoctorCalendar, type TimeRange } from './seed-data/scheduler';

/**
 * Seeds fictional demo data. Idempotent:
 * - reference data, users and profiles are upserted by slug / email;
 * - keyword, doctor-specialization, availability and symptom-rule rows are
 *   replaced for the seeded entities;
 * - appointments involving any demo account (plus seeded notifications and
 *   audit entries) are deleted and re-created relative to "now".
 */

export interface SeedOptions {
  adminEmail: string;
  adminPassword: string;
  /** Reference instant for relative dates. Defaults to the current time. */
  now?: DateTime;
}

export interface CredentialRow {
  role: Role;
  name: string;
  email: string;
  password: string;
  status: string;
}

type Tx = Prisma.TransactionClient;

const adminEnvSchema = z.object({
  ADMIN_EMAIL: z.email({ error: 'ADMIN_EMAIL must be a valid email address' }),
  ADMIN_PASSWORD: z.string().min(8, { error: 'ADMIN_PASSWORD must be at least 8 characters' }),
});

/**
 * Reads the seed admin from the environment.
 *
 * @throws Error naming the missing or invalid variables (never their values).
 */
export function readAdminCredentials(
  env: NodeJS.ProcessEnv = process.env,
): Pick<SeedOptions, 'adminEmail' | 'adminPassword'> {
  const missing = (['ADMIN_EMAIL', 'ADMIN_PASSWORD'] as const).filter((name) => !env[name]);
  if (missing.length > 0) {
    throw new Error(
      `${missing.join(' and ')} must be set to seed the admin account (see apps/api/.env.example).`,
    );
  }
  const result = adminEnvSchema.safeParse(env);
  if (!result.success) {
    throw new Error(result.error.issues.map((issue) => issue.message).join('; '));
  }
  return { adminEmail: result.data.ADMIN_EMAIL, adminPassword: result.data.ADMIN_PASSWORD };
}

/**
 * Loads the full demo dataset in one transaction and returns the demo
 * credentials. Safe to run repeatedly.
 */
export async function seed(prisma: PrismaClient, options: SeedOptions): Promise<CredentialRow[]> {
  const now = (options.now ?? DateTime.utc()).toUTC().startOf('minute');
  const adminEmail = options.adminEmail.trim().toLowerCase();

  // Hash outside the transaction: argon2 is deliberately slow.
  const adminHash = await hash(options.adminPassword);
  const demoHashes = new Map<string, string>(
    await Promise.all(
      [...DOCTORS, ...PATIENTS].map(async (p) => [p.email, await hash(DEMO_PASSWORD)] as const),
    ),
  );
  const demoHash = (email: string): string => {
    const value = demoHashes.get(email);
    if (!value) throw new Error(`Missing password hash for ${email}.`);
    return value;
  };

  await prisma.$transaction(
    async (tx) => {
      const admin = await tx.user.upsert({
        where: { email: adminEmail },
        create: { email: adminEmail, passwordHash: adminHash, role: Role.ADMIN },
        update: { passwordHash: adminHash, role: Role.ADMIN, status: 'ACTIVE', statusReason: null },
      });

      const specializationIds = await seedCatalog(tx);
      const doctorIds = await seedDoctors(tx, {
        now,
        adminId: admin.id,
        specializationIds,
        demoHash,
      });
      const patientIds = await seedPatients(tx, { now, demoHash });
      const appointments = await seedAppointments(tx, { now, doctorIds, patientIds });
      await seedNotifications(tx, { now, doctorIds, patientIds, appointments });
      await seedAuditLogs(tx, { now, adminId: admin.id, doctorIds, patientIds, appointments });
    },
    { timeout: 60_000 },
  );

  return [
    {
      role: Role.ADMIN,
      name: 'Seed admin',
      email: adminEmail,
      password: '(value of ADMIN_PASSWORD)',
      status: 'ACTIVE',
    },
    ...DOCTORS.map((d) => ({
      role: Role.DOCTOR,
      name: `Dr. ${d.firstName} ${d.lastName}`,
      email: d.email,
      password: DEMO_PASSWORD,
      status: d.verificationStatus,
    })),
    ...PATIENTS.map((p) => ({
      role: Role.PATIENT,
      name: `${p.firstName} ${p.lastName}`,
      email: p.email,
      password: DEMO_PASSWORD,
      status: 'ACTIVE',
    })),
  ];
}

// ---------------------------------------------------------------------------
// Catalog: specializations, symptoms, keywords
// ---------------------------------------------------------------------------

async function seedCatalog(tx: Tx): Promise<Map<SpecializationSlug, string>> {
  const specializationIds = new Map<SpecializationSlug, string>();
  for (const s of SPECIALIZATIONS) {
    const row = await tx.specialization.upsert({
      where: { slug: s.slug },
      create: s,
      update: { name: s.name, description: s.description },
    });
    specializationIds.set(s.slug, row.id);
  }
  const specId = (slug: SpecializationSlug): string => {
    const id = specializationIds.get(slug);
    if (!id) throw new Error(`Unknown specialization "${slug}".`);
    return id;
  };

  const symptomIds: string[] = [];
  const rules: Prisma.SymptomSpecializationRuleCreateManyInput[] = [];
  for (const s of SYMPTOMS) {
    const data = { name: s.name, category: s.category, isRedFlag: s.isRedFlag ?? false };
    const row = await tx.symptom.upsert({
      where: { slug: s.slug },
      create: { slug: s.slug, ...data },
      update: data,
    });
    symptomIds.push(row.id);
    for (const [slug, weight] of s.rules) {
      rules.push({ symptomId: row.id, specializationId: specId(slug), weight });
    }
  }
  await tx.symptomSpecializationRule.deleteMany({ where: { symptomId: { in: symptomIds } } });
  await tx.symptomSpecializationRule.createMany({ data: rules });

  await tx.matchingKeyword.deleteMany({ where: { phrase: { in: KEYWORDS.map((k) => k.phrase) } } });
  await tx.matchingKeyword.createMany({
    data: KEYWORDS.map((k) => ({
      phrase: k.phrase,
      specializationId: k.specialization ? specId(k.specialization) : null,
      weight: k.weight,
      isRedFlag: k.isRedFlag ?? false,
    })),
  });

  return specializationIds;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

interface DoctorRecord {
  userId: string;
  profileId: string;
  name: string;
  calendar: DoctorCalendar;
}

async function seedDoctors(
  tx: Tx,
  ctx: {
    now: DateTime;
    adminId: string;
    specializationIds: Map<SpecializationSlug, string>;
    demoHash: (email: string) => string;
  },
): Promise<Map<DoctorKey, DoctorRecord>> {
  const doctors = new Map<DoctorKey, DoctorRecord>();

  for (const [index, d] of DOCTORS.entries()) {
    const user = await tx.user.upsert({
      where: { email: d.email },
      create: {
        email: d.email,
        passwordHash: ctx.demoHash(d.email),
        role: Role.DOCTOR,
        createdAt: ctx.now.minus({ days: 120 - index }).toJSDate(),
      },
      update: {
        passwordHash: ctx.demoHash(d.email),
        role: Role.DOCTOR,
        status: 'ACTIVE',
        statusReason: null,
      },
    });

    const reviewed = d.verificationStatus !== VerificationStatus.PENDING;
    const profile = {
      firstName: d.firstName,
      lastName: d.lastName,
      title: 'Dr.',
      bio: d.bio,
      yearsExperience: d.yearsExperience,
      licenseNumber: fakeLicenseNumber(index),
      languages: d.languages,
      consultationMinutes: d.consultationMinutes,
      timezone: d.timezone,
      verificationStatus: d.verificationStatus,
      reviewNote: d.reviewNote ?? null,
      reviewedById: reviewed ? ctx.adminId : null,
      reviewedAt: reviewed ? ctx.now.minus({ days: 90 - index * 3 }).toJSDate() : null,
    };
    const doctorProfile = await tx.doctorProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...profile },
      update: profile,
    });

    await tx.doctorSpecialization.deleteMany({ where: { doctorId: user.id } });
    await tx.doctorSpecialization.createMany({
      data: d.specializations.map((slug, i) => {
        const specializationId = ctx.specializationIds.get(slug);
        if (!specializationId) throw new Error(`Unknown specialization "${slug}".`);
        return { doctorId: user.id, specializationId, isPrimary: i === 0 };
      }),
    });

    const rules = d.availability.map(([dayOfWeek, startTime, endTime]) => ({
      dayOfWeek,
      startTime,
      endTime,
    }));
    await tx.availabilityRule.deleteMany({ where: { doctorId: user.id } });
    await tx.availabilityRule.createMany({ data: rules.map((r) => ({ doctorId: user.id, ...r })) });

    const today = ctx.now.setZone(d.timezone).startOf('day');
    const exceptions = (d.blockedDayOffsets ?? []).map(({ offset, reason }) => {
      const start = today.plus({ days: offset });
      return { startAt: start.toJSDate(), endAt: start.plus({ days: 1 }).toJSDate(), reason };
    });
    await tx.availabilityException.deleteMany({ where: { doctorId: user.id } });
    await tx.availabilityException.createMany({
      data: exceptions.map((e) => ({ doctorId: user.id, ...e })),
    });

    doctors.set(d.key, {
      userId: user.id,
      profileId: doctorProfile.id,
      name: `Dr. ${d.firstName} ${d.lastName}`,
      calendar: {
        id: user.id,
        timezone: d.timezone,
        consultationMinutes: d.consultationMinutes,
        rules,
        exceptions,
      },
    });
  }
  return doctors;
}

interface PatientRecord {
  userId: string;
  name: string;
}

async function seedPatients(
  tx: Tx,
  ctx: { now: DateTime; demoHash: (email: string) => string },
): Promise<Map<PatientKey, PatientRecord>> {
  const patients = new Map<PatientKey, PatientRecord>();

  for (const [index, p] of PATIENTS.entries()) {
    const user = await tx.user.upsert({
      where: { email: p.email },
      create: {
        email: p.email,
        passwordHash: ctx.demoHash(p.email),
        role: Role.PATIENT,
        createdAt: ctx.now.minus({ days: 100 - index }).toJSDate(),
      },
      update: {
        passwordHash: ctx.demoHash(p.email),
        role: Role.PATIENT,
        status: 'ACTIVE',
        statusReason: null,
      },
    });

    const { key: _key, email: _email, birthDate, ...rest } = p;
    const profile = {
      ...rest,
      birthDate: new Date(`${birthDate}T00:00:00.000Z`),
      country: 'Philippines',
      profileCompleted: true,
    };
    await tx.patientProfile.upsert({
      where: { userId: user.id },
      create: { userId: user.id, ...profile },
      update: profile,
    });

    patients.set(p.key, { userId: user.id, name: `${p.firstName} ${p.lastName}` });
  }
  return patients;
}

// ---------------------------------------------------------------------------
// Appointments, sessions, notes, prescriptions
// ---------------------------------------------------------------------------

interface SeededAppointment extends TimeRange {
  id: string;
  seed: AppointmentSeed;
  doctor: DoctorRecord;
  patient: PatientRecord;
}

function lookup<K, V>(map: Map<K, V>, key: K): V {
  const value = map.get(key);
  if (value === undefined) throw new Error(`Unknown seed reference "${String(key)}".`);
  return value;
}

async function seedAppointments(
  tx: Tx,
  ctx: {
    now: DateTime;
    doctorIds: Map<DoctorKey, DoctorRecord>;
    patientIds: Map<PatientKey, PatientRecord>;
  },
): Promise<Map<string, SeededAppointment>> {
  const demoUserIds = [
    ...[...ctx.doctorIds.values()].map((d) => d.userId),
    ...[...ctx.patientIds.values()].map((p) => p.userId),
  ];
  // Cascades to events, sessions, notes and prescriptions.
  await tx.appointment.deleteMany({
    where: { OR: [{ doctorId: { in: demoUserIds } }, { patientId: { in: demoUserIds } }] },
  });

  const scheduler = new SlotScheduler();
  const seeded = new Map<string, SeededAppointment>();

  for (const a of APPOINTMENTS) {
    const doctor = lookup(ctx.doctorIds, a.doctor);
    const patient = lookup(ctx.patientIds, a.patient);
    const searchFrom = ctx.now
      .setZone(doctor.calendar.timezone)
      .startOf('day')
      .plus({ days: a.fromDayOffset });
    const slot =
      a.status === 'SCHEDULED'
        ? scheduler.reserve(
            doctor.calendar,
            patient.userId,
            DateTime.max(searchFrom, ctx.now.plus({ hours: 1 })),
            ctx.now.plus({ days: 14 }),
          )
        : scheduler.reserve(doctor.calendar, patient.userId, searchFrom, ctx.now);

    const id = seedId(`appointment:${a.key}`);
    const start = DateTime.fromJSDate(slot.startAt);
    const end = DateTime.fromJSDate(slot.endAt);
    const bookedAt =
      a.status === 'SCHEDULED'
        ? DateTime.min(start.minus({ days: 3 }), ctx.now.minus({ hours: 2 }))
        : start.minus({ days: 7 });

    const events: Prisma.AppointmentEventCreateWithoutAppointmentInput[] = [
      {
        type: AppointmentEventType.CREATED,
        actor: { connect: { id: patient.userId } },
        toStartAt: slot.startAt,
        createdAt: bookedAt.toJSDate(),
      },
    ];
    const data: Prisma.AppointmentCreateInput = {
      id,
      patient: { connect: { id: patient.userId } },
      doctor: { connect: { id: doctor.userId } },
      startAt: slot.startAt,
      endAt: slot.endAt,
      status: AppointmentStatus[a.status],
      reasonForVisit: a.reasonForVisit,
      createdAt: bookedAt.toJSDate(),
      events: { create: events },
    };

    if (a.status === 'CANCELLED') {
      const cancelledById = a.cancelledBy === 'doctor' ? doctor.userId : patient.userId;
      const cancelledAt = start.minus({ days: 1 }).toJSDate();
      Object.assign(data, {
        cancelledBy: { connect: { id: cancelledById } },
        cancelledAt,
        cancellationReason: a.cancellationReason,
        version: 1,
      });
      events.push({
        type: AppointmentEventType.CANCELLED,
        actor: { connect: { id: cancelledById } },
        fromStartAt: slot.startAt,
        reason: a.cancellationReason,
        createdAt: cancelledAt,
      });
    }

    if (a.status === 'COMPLETED') {
      const endedAt = end.minus({ minutes: 5 }).toJSDate();
      Object.assign(data, {
        version: 1,
        session: {
          create: {
            state: SessionState.COMPLETED,
            patientJoinedAt: start.minus({ minutes: 3 }).toJSDate(),
            doctorJoinedAt: start.minus({ minutes: 1 }).toJSDate(),
            startedAt: slot.startAt,
            endedAt,
          },
        },
        note: {
          create: {
            ...a.note,
            doctor: { connect: { id: doctor.userId } },
            patient: { connect: { id: patient.userId } },
            status: NoteStatus.FINALIZED,
            finalizedAt: end.plus({ minutes: 30 }).toJSDate(),
          },
        },
        prescriptions: a.prescription && {
          create: {
            doctor: { connect: { id: doctor.userId } },
            patient: { connect: { id: patient.userId } },
            status: PrescriptionStatus.ISSUED,
            notes: a.prescription.notes ?? null,
            issuedAt: end.plus({ minutes: 20 }).toJSDate(),
            items: { create: a.prescription.items },
          },
        },
      } satisfies Partial<Prisma.AppointmentCreateInput>);
      events.push({
        type: AppointmentEventType.COMPLETED,
        actor: { connect: { id: doctor.userId } },
        createdAt: endedAt,
      });
    }

    await tx.appointment.create({ data });
    seeded.set(a.key, { id, seed: a, doctor, patient, ...slot });
  }
  return seeded;
}

// ---------------------------------------------------------------------------
// Notifications & audit log
// ---------------------------------------------------------------------------

async function seedNotifications(
  tx: Tx,
  ctx: {
    now: DateTime;
    doctorIds: Map<DoctorKey, DoctorRecord>;
    patientIds: Map<PatientKey, PatientRecord>;
    appointments: Map<string, SeededAppointment>;
  },
): Promise<void> {
  const appt = (key: string) => lookup(ctx.appointments, key);
  const doctor = (key: DoctorKey) => lookup(ctx.doctorIds, key);
  const ago = (hours: number) => ctx.now.minus({ hours }).toJSDate();

  const rows: (Omit<Prisma.NotificationCreateManyInput, 'id'> & { key: string })[] = [
    {
      key: 's1-booked-patient',
      userId: appt('s1').patient.userId,
      type: NotificationType.APPOINTMENT_BOOKED,
      title: 'Appointment confirmed',
      body: `Your appointment with ${appt('s1').doctor.name} is confirmed.`,
      link: `/appointments/${appt('s1').id}`,
      createdAt: ago(30),
    },
    {
      key: 's1-booked-doctor',
      userId: appt('s1').doctor.userId,
      type: NotificationType.APPOINTMENT_BOOKED,
      title: 'New appointment',
      body: `${appt('s1').patient.name} booked a consultation with you.`,
      link: `/appointments/${appt('s1').id}`,
      readAt: ago(20),
      createdAt: ago(30),
    },
    {
      key: 's1-reminder',
      userId: appt('s1').patient.userId,
      type: NotificationType.APPOINTMENT_REMINDER,
      title: 'Upcoming appointment',
      body: `Reminder: you have an upcoming consultation with ${appt('s1').doctor.name}.`,
      link: `/appointments/${appt('s1').id}`,
      createdAt: ago(2),
    },
    {
      key: 's5-booked-patient',
      userId: appt('s5').patient.userId,
      type: NotificationType.APPOINTMENT_BOOKED,
      title: 'Appointment confirmed',
      body: `Your appointment with ${appt('s5').doctor.name} is confirmed.`,
      link: `/appointments/${appt('s5').id}`,
      createdAt: ago(48),
    },
    {
      key: 'c1-record',
      userId: appt('c1').patient.userId,
      type: NotificationType.RECORD_AVAILABLE,
      title: 'Consultation summary available',
      body: `${appt('c1').doctor.name} finalized the notes from your consultation.`,
      link: `/appointments/${appt('c1').id}`,
      readAt: ago(24 * 30),
      createdAt: appt('c1').endAt,
    },
    {
      key: 'c4-record',
      userId: appt('c4').patient.userId,
      type: NotificationType.RECORD_AVAILABLE,
      title: 'Prescription issued',
      body: `${appt('c4').doctor.name} issued a prescription from your consultation.`,
      link: `/appointments/${appt('c4').id}`,
      createdAt: appt('c4').endAt,
    },
    {
      key: 'x2-cancelled-patient',
      userId: appt('x2').patient.userId,
      type: NotificationType.APPOINTMENT_CANCELLED,
      title: 'Appointment cancelled',
      body: `${appt('x2').doctor.name} cancelled your appointment. You can book another time.`,
      link: `/appointments/${appt('x2').id}`,
      readAt: ago(24 * 10),
      createdAt: ago(24 * 16),
    },
    {
      key: 'x3-cancelled-doctor',
      userId: appt('x3').doctor.userId,
      type: NotificationType.APPOINTMENT_CANCELLED,
      title: 'Appointment cancelled',
      body: `${appt('x3').patient.name} cancelled their appointment.`,
      link: `/appointments/${appt('x3').id}`,
      createdAt: ago(24 * 6),
    },
    {
      key: 'cruz-pending',
      userId: doctor('cruz').userId,
      type: NotificationType.ACCOUNT_STATUS,
      title: 'Application under review',
      body: 'Thanks for registering. An administrator is reviewing your (fictional) credentials.',
      createdAt: ago(24 * 3),
    },
    {
      key: 'mendoza-approved',
      userId: doctor('mendoza').userId,
      type: NotificationType.DOCTOR_REVIEWED,
      title: 'Profile approved',
      body: 'Your doctor profile was approved. Patients can now book with you.',
      readAt: ago(24 * 60),
      createdAt: ago(24 * 66),
    },
    {
      key: 'ocampo-rejected',
      userId: doctor('ocampo').userId,
      type: NotificationType.DOCTOR_REVIEWED,
      title: 'Profile not approved',
      body: 'Your doctor profile was not approved. See the review note for details.',
      createdAt: ago(24 * 57),
    },
  ];

  const data = rows.map(({ key, ...row }) => ({ id: seedId(`notification:${key}`), ...row }));
  await tx.notification.deleteMany({ where: { id: { in: data.map((n) => n.id) } } });
  await tx.notification.createMany({ data });
}

async function seedAuditLogs(
  tx: Tx,
  ctx: {
    now: DateTime;
    adminId: string;
    doctorIds: Map<DoctorKey, DoctorRecord>;
    patientIds: Map<PatientKey, PatientRecord>;
    appointments: Map<string, SeededAppointment>;
  },
): Promise<void> {
  const rows: Prisma.AuditLogCreateManyInput[] = [];

  for (const [index, d] of DOCTORS.entries()) {
    if (d.verificationStatus === VerificationStatus.PENDING) continue;
    const approved = d.verificationStatus === VerificationStatus.APPROVED;
    rows.push({
      id: seedId(`audit:doctor-review:${d.key}`),
      actorId: ctx.adminId,
      action: approved ? 'DOCTOR_APPROVED' : 'DOCTOR_REJECTED',
      entityType: 'DoctorProfile',
      entityId: lookup(ctx.doctorIds, d.key).profileId,
      before: { verificationStatus: VerificationStatus.PENDING },
      after: { verificationStatus: d.verificationStatus },
      reason: d.reviewNote ?? null,
      createdAt: ctx.now.minus({ days: 90 - index * 3 }).toJSDate(),
    });
  }

  for (const a of ctx.appointments.values()) {
    if (a.seed.status !== 'CANCELLED') continue;
    rows.push({
      id: seedId(`audit:appointment-cancel:${a.seed.key}`),
      actorId: a.seed.cancelledBy === 'doctor' ? a.doctor.userId : a.patient.userId,
      action: 'APPOINTMENT_CANCELLED',
      entityType: 'Appointment',
      entityId: a.id,
      before: { status: AppointmentStatus.SCHEDULED },
      after: { status: AppointmentStatus.CANCELLED },
      reason: a.seed.cancellationReason,
      createdAt: DateTime.fromJSDate(a.startAt).minus({ days: 1 }).toJSDate(),
    });
  }

  await tx.auditLog.deleteMany({ where: { id: { in: rows.map((r) => r.id as string) } } });
  await tx.auditLog.createMany({ data: rows });
}

// ---------------------------------------------------------------------------
// CLI entry point (`pnpm db:seed`)
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const admin = readAdminCredentials();
  const prisma = new PrismaClient();
  try {
    const credentials = await seed(prisma, admin);
    console.log('Seed complete. Demo credentials (all data is fictional):');
    console.table(credentials);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('Seed failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
