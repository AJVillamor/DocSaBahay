import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorCode } from '@doksabahay/shared';
import { VerificationStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'Password123!';
const ZONE = 'Asia/Manila';

function cookiesFrom(response: Response): string[] {
  const header = response.headers['set-cookie'] as unknown as string[] | undefined;
  return (header ?? [])
    .map((cookie) => cookie.split(';')[0] ?? '')
    .filter((pair) => !pair.endsWith('='));
}

describe('GET /doctors/:id/slots (db_test)', () => {
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

  async function asPatientCookies(): Promise<string[]> {
    const email = uniqueEmail('patient');
    const response = await http()
      .post('/auth/register/patient')
      .send({ email, password: PASSWORD })
      .expect(201);
    return cookiesFrom(response);
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

  it('rejects an unauthenticated caller', async () => {
    const { id } = await registerDoctor();
    const from = DateTime.utc().toISO();
    const to = DateTime.utc().plus({ days: 1 }).toISO();

    await http().get(`/doctors/${id}/slots?from=${from}&to=${to}`).expect(401);
  });

  it('rejects a from/to range spanning more than 31 days', async () => {
    const { id } = await registerDoctor();
    const cookies = await asPatientCookies();
    const from = DateTime.utc().toISO();
    const to = DateTime.utc().plus({ days: 40 }).toISO();

    const response = await http()
      .get(`/doctors/${id}/slots?from=${from}&to=${to}`)
      .set('Cookie', cookies)
      .expect(400);
    expect(response.body).toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
  });

  it('returns 404 for a doctor who is not APPROVED (never reveals why)', async () => {
    const { id } = await registerDoctor(); // still PENDING
    const cookies = await asPatientCookies();
    const from = DateTime.utc().toISO();
    const to = DateTime.utc().plus({ days: 1 }).toISO();

    const response = await http()
      .get(`/doctors/${id}/slots?from=${from}&to=${to}`)
      .set('Cookie', cookies)
      .expect(404);
    expect(response.body).toMatchObject({ code: ErrorCode.NOT_FOUND });
  });

  it('returns 404 for an unknown doctor id', async () => {
    const cookies = await asPatientCookies();
    const from = DateTime.utc().toISO();
    const to = DateTime.utc().plus({ days: 1 }).toISO();

    await http()
      .get(`/doctors/00000000-0000-4000-8000-000000000000/slots?from=${from}&to=${to}`)
      .set('Cookie', cookies)
      .expect(404);
  });

  it('returns generated slots for an APPROVED, ACTIVE doctor', async () => {
    const { id, cookies: doctorCookies } = await registerDoctor();
    await prisma.doctorProfile.update({
      where: { userId: id },
      data: { verificationStatus: VerificationStatus.APPROVED },
    });
    const dayOfWeek = DateTime.now().setZone(ZONE).plus({ days: 2 }).weekday % 7;
    await http()
      .post('/doctors/me/availability/rules')
      .set('Cookie', doctorCookies)
      .send({ dayOfWeek, startTime: '09:00', endTime: '10:00' })
      .expect(201);

    const patientCookies = await asPatientCookies();
    const from = DateTime.utc().toISO();
    const to = DateTime.utc().plus({ days: 7 }).toISO();
    const response = await http()
      .get(`/doctors/${id}/slots?from=${from}&to=${to}`)
      .set('Cookie', patientCookies)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect((response.body as { startAt: string; endAt: string }[]).length).toBeGreaterThan(0);
    for (const slot of response.body as { startAt: string; endAt: string }[]) {
      expect(new Date(slot.endAt).getTime()).toBeGreaterThan(new Date(slot.startAt).getTime());
    }
  });
});
