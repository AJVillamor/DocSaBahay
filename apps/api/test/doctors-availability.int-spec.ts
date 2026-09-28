import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorCode } from '@doksabahay/shared';
import { AppointmentStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'Password123!';
const ZONE = 'Asia/Manila'; // Default timezone for a newly registered doctor.

function cookiesFrom(response: Response): string[] {
  const header = response.headers['set-cookie'] as unknown as string[] | undefined;
  return (header ?? [])
    .map((cookie) => cookie.split(';')[0] ?? '')
    .filter((pair) => !pair.endsWith('='));
}

describe('doctor availability (db_test)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let specializationId: string;
  let emailCounter = 0;

  const http = () => request(app.getHttpServer());
  const uniqueEmail = (label: string): string => `${label}.${++emailCounter}@example.com`;

  async function wipe(): Promise<void> {
    await prisma.$executeRawUnsafe('TRUNCATE users, specializations CASCADE');
  }

  async function registerDoctor(): Promise<{ cookies: string[]; id: string }> {
    const email = uniqueEmail('doctor');
    const response = await http()
      .post('/auth/register/doctor')
      .send({
        email,
        password: PASSWORD,
        firstName: 'Test',
        lastName: 'Doctor',
        primarySpecializationId: specializationId,
        licenseNumber: `FAKE-${++emailCounter}`,
      })
      .expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    return { cookies: cookiesFrom(response), id: user.id };
  }

  async function registerPatient(): Promise<{ id: string }> {
    const email = uniqueEmail('patient');
    await http().post('/auth/register/patient').send({ email, password: PASSWORD }).expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    return { id: user.id };
  }

  /** A local instant tomorrow at `hour:minute` in the doctor's default timezone, as a UTC Date. */
  function tomorrowAt(hour: number, minute = 0): Date {
    return DateTime.now()
      .setZone(ZONE)
      .plus({ days: 1 })
      .set({ hour, minute, second: 0, millisecond: 0 })
      .toJSDate();
  }

  function tomorrowDayOfWeek(): number {
    return DateTime.now().setZone(ZONE).plus({ days: 1 }).weekday % 7;
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, { webOrigin: 'http://localhost:3000' });
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await wipe();
    const specialization = await prisma.specialization.create({
      data: { name: 'General Practice', slug: 'general-practice', description: 'Fictional' },
    });
    specializationId = specialization.id;
  });

  afterAll(async () => {
    await wipe();
    await app.close();
  });

  describe('POST /doctors/me/availability/rules', () => {
    it('rejects endTime that is not after startTime', async () => {
      const { cookies } = await registerDoctor();

      const response = await http()
        .post('/doctors/me/availability/rules')
        .set('Cookie', cookies)
        .send({ dayOfWeek: 1, startTime: '10:00', endTime: '10:00' })
        .expect(400);
      expect(response.body).toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    });

    it('rejects a time not on a 15-minute increment', async () => {
      const { cookies } = await registerDoctor();

      const response = await http()
        .post('/doctors/me/availability/rules')
        .set('Cookie', cookies)
        .send({ dayOfWeek: 1, startTime: '09:05', endTime: '10:00' })
        .expect(400);
      expect(response.body).toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    });

    it('creates a rule', async () => {
      const { cookies } = await registerDoctor();

      const response = await http()
        .post('/doctors/me/availability/rules')
        .set('Cookie', cookies)
        .send({ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' })
        .expect(201);
      expect(response.body).toMatchObject({ dayOfWeek: 1, startTime: '09:00', endTime: '12:00' });
    });

    it('rejects a rule that overlaps an existing rule on the same day', async () => {
      const { cookies } = await registerDoctor();
      await http()
        .post('/doctors/me/availability/rules')
        .set('Cookie', cookies)
        .send({ dayOfWeek: 2, startTime: '09:00', endTime: '12:00' })
        .expect(201);

      const response = await http()
        .post('/doctors/me/availability/rules')
        .set('Cookie', cookies)
        .send({ dayOfWeek: 2, startTime: '11:00', endTime: '13:00' })
        .expect(400);
      expect(response.body).toMatchObject({ code: ErrorCode.RULE_OVERLAP });
    });

    it('does not reject a non-overlapping rule on the same day', async () => {
      const { cookies } = await registerDoctor();
      await http()
        .post('/doctors/me/availability/rules')
        .set('Cookie', cookies)
        .send({ dayOfWeek: 3, startTime: '09:00', endTime: '12:00' })
        .expect(201);

      await http()
        .post('/doctors/me/availability/rules')
        .set('Cookie', cookies)
        .send({ dayOfWeek: 3, startTime: '12:00', endTime: '13:00' })
        .expect(201);
    });
  });

  describe('PATCH /doctors/me/availability/rules/:id', () => {
    it('rejects an update that would overlap another rule on the same day', async () => {
      const { cookies } = await registerDoctor();
      await http()
        .post('/doctors/me/availability/rules')
        .set('Cookie', cookies)
        .send({ dayOfWeek: 4, startTime: '09:00', endTime: '10:00' })
        .expect(201);
      const second = await http()
        .post('/doctors/me/availability/rules')
        .set('Cookie', cookies)
        .send({ dayOfWeek: 4, startTime: '11:00', endTime: '12:00' })
        .expect(201);

      const response = await http()
        .patch(`/doctors/me/availability/rules/${(second.body as { id: string }).id}`)
        .set('Cookie', cookies)
        .send({ startTime: '09:30' })
        .expect(400);
      expect(response.body).toMatchObject({ code: ErrorCode.RULE_OVERLAP });
    });
  });

  describe('DELETE /doctors/me/availability/rules/:id', () => {
    it('deletes a rule with no bookings', async () => {
      const { cookies } = await registerDoctor();
      const created = await http()
        .post('/doctors/me/availability/rules')
        .set('Cookie', cookies)
        .send({ dayOfWeek: 5, startTime: '09:00', endTime: '10:00' })
        .expect(201);

      await http()
        .delete(`/doctors/me/availability/rules/${(created.body as { id: string }).id}`)
        .set('Cookie', cookies)
        .expect(204);
    });

    it('rejects deleting a rule that still covers a SCHEDULED appointment, listing it', async () => {
      const { cookies, id: doctorId } = await registerDoctor();
      const { id: patientId } = await registerPatient();
      const dayOfWeek = tomorrowDayOfWeek();
      const created = await http()
        .post('/doctors/me/availability/rules')
        .set('Cookie', cookies)
        .send({ dayOfWeek, startTime: '09:00', endTime: '10:00' })
        .expect(201);
      const appointment = await prisma.appointment.create({
        data: {
          doctorId,
          patientId,
          startAt: tomorrowAt(9, 0),
          endAt: tomorrowAt(9, 30),
          status: AppointmentStatus.SCHEDULED,
          reasonForVisit: 'Fictional test visit',
        },
      });

      const response = await http()
        .delete(`/doctors/me/availability/rules/${(created.body as { id: string }).id}`)
        .set('Cookie', cookies)
        .expect(409);

      expect(response.body).toMatchObject({ code: ErrorCode.SCHEDULE_CONFLICT });
      expect(
        (response.body as { details: { appointments: { id: string }[] } }).details.appointments.map(
          (a) => a.id,
        ),
      ).toEqual([appointment.id]);
    });
  });

  describe('POST /doctors/me/availability/exceptions', () => {
    it('rejects endAt that is not after startAt', async () => {
      const { cookies } = await registerDoctor();
      const at = tomorrowAt(9, 0).toISOString();

      const response = await http()
        .post('/doctors/me/availability/exceptions')
        .set('Cookie', cookies)
        .send({ startAt: at, endAt: at })
        .expect(400);
      expect(response.body).toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    });

    it('creates an exception with no conflicting appointment', async () => {
      const { cookies } = await registerDoctor();

      const response = await http()
        .post('/doctors/me/availability/exceptions')
        .set('Cookie', cookies)
        .send({
          startAt: tomorrowAt(9, 0).toISOString(),
          endAt: tomorrowAt(11, 0).toISOString(),
          reason: 'Fictional time off',
        })
        .expect(201);
      expect(response.body).toMatchObject({ reason: 'Fictional time off' });

      const list = await http()
        .get('/doctors/me/availability/exceptions')
        .set('Cookie', cookies)
        .expect(200);
      expect(list.body).toHaveLength(1);
    });

    it('rejects an exception that would remove time already booked, listing the appointment', async () => {
      const { cookies, id: doctorId } = await registerDoctor();
      const { id: patientId } = await registerPatient();
      const appointment = await prisma.appointment.create({
        data: {
          doctorId,
          patientId,
          startAt: tomorrowAt(14, 0),
          endAt: tomorrowAt(14, 30),
          status: AppointmentStatus.SCHEDULED,
          reasonForVisit: 'Fictional test visit',
        },
      });

      const response = await http()
        .post('/doctors/me/availability/exceptions')
        .set('Cookie', cookies)
        .send({ startAt: tomorrowAt(13, 0).toISOString(), endAt: tomorrowAt(15, 0).toISOString() })
        .expect(409);

      expect(response.body).toMatchObject({ code: ErrorCode.SCHEDULE_CONFLICT });
      expect(
        (response.body as { details: { appointments: { id: string }[] } }).details.appointments.map(
          (a) => a.id,
        ),
      ).toEqual([appointment.id]);
    });
  });

  describe('DELETE /doctors/me/availability/exceptions/:id', () => {
    it('deletes an exception without a booking-conflict check', async () => {
      const { cookies } = await registerDoctor();
      const created = await http()
        .post('/doctors/me/availability/exceptions')
        .set('Cookie', cookies)
        .send({ startAt: tomorrowAt(9, 0).toISOString(), endAt: tomorrowAt(10, 0).toISOString() })
        .expect(201);

      await http()
        .delete(`/doctors/me/availability/exceptions/${(created.body as { id: string }).id}`)
        .set('Cookie', cookies)
        .expect(204);
    });
  });

  describe('role guarding', () => {
    it('rejects a non-doctor caller on rules and exceptions', async () => {
      const email = uniqueEmail('patient');
      const patientResponse = await http()
        .post('/auth/register/patient')
        .send({ email, password: PASSWORD })
        .expect(201);
      const cookies = cookiesFrom(patientResponse);

      const rules = await http()
        .get('/doctors/me/availability/rules')
        .set('Cookie', cookies)
        .expect(403);
      expect(rules.body).toMatchObject({ code: ErrorCode.FORBIDDEN });

      const exceptions = await http()
        .get('/doctors/me/availability/exceptions')
        .set('Cookie', cookies)
        .expect(403);
      expect(exceptions.body).toMatchObject({ code: ErrorCode.FORBIDDEN });
    });

    it('rejects an unauthenticated caller', async () => {
      await http().get('/doctors/me/availability/rules').expect(401);
    });
  });
});
