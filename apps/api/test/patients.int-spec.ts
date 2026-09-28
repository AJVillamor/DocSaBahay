import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorCode } from '@doksabahay/shared';
import { Role } from '@prisma/client';
import { hash } from 'argon2';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'Password123!';

/** `name=value` pairs from Set-Cookie, skipping cookies that are being cleared. */
function cookiesFrom(response: Response): string[] {
  const header = response.headers['set-cookie'] as unknown as string[] | undefined;
  return (header ?? [])
    .map((cookie) => cookie.split(';')[0] ?? '')
    .filter((pair) => !pair.endsWith('='));
}

/** Every field required to complete a profile; no optional fields. */
const REQUIRED_FIELDS = {
  firstName: 'Maria',
  lastName: 'Santos',
  birthDate: '1990-05-14',
  weightKg: 65.5,
  heightCm: 165,
  phone: '+63 917 123 4567',
  city: 'Quezon City',
  country: 'Philippines',
};

const OPTIONAL_FIELDS = {
  emergencyContactName: 'Juan Santos',
  emergencyContactPhone: '+63 917 987 6543',
  allergies: 'Penicillin',
  chronicConditions: 'Type 2 diabetes',
  currentMedications: 'Metformin 500mg twice daily',
  pastSurgeries: 'Appendectomy (2015)',
};

describe('patients (db_test)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let emailCounter = 0;

  const uniqueEmail = (label: string): string => `${label}.${++emailCounter}@example.com`;
  const http = () => request(app.getHttpServer());

  async function wipe(): Promise<void> {
    await prisma.$executeRawUnsafe('TRUNCATE users, specializations CASCADE');
  }

  /** Registers a fresh patient and returns their auth cookies. */
  async function signUpPatient(): Promise<string[]> {
    const response = await http()
      .post('/auth/register/patient')
      .send({ email: uniqueEmail('patient'), password: PASSWORD })
      .expect(201);
    return cookiesFrom(response);
  }

  /** Registers a fresh (PENDING) doctor and returns their auth cookies. */
  async function signUpDoctor(): Promise<string[]> {
    const specialization = await prisma.specialization.create({
      data: {
        name: `Specialization ${emailCounter}`,
        slug: `specialization-${emailCounter}`,
        description: 'Fictional',
      },
    });
    const response = await http()
      .post('/auth/register/doctor')
      .send({
        email: uniqueEmail('doctor'),
        password: PASSWORD,
        firstName: 'Jose',
        lastName: 'Reyes',
        primarySpecializationId: specialization.id,
        licenseNumber: `FAKE-${emailCounter}`,
      })
      .expect(201);
    return cookiesFrom(response);
  }

  /** Creates a seeded ADMIN and returns their auth cookies. */
  async function signUpAdmin(): Promise<string[]> {
    const email = uniqueEmail('admin');
    await prisma.user.create({
      data: { email, passwordHash: await hash(PASSWORD), role: Role.ADMIN },
    });
    const response = await http()
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(200);
    return cookiesFrom(response);
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, { webOrigin: 'http://localhost:3000' });
    await app.init();

    prisma = app.get(PrismaService);
    await wipe();
  });

  afterAll(async () => {
    await wipe();
    await app.close();
  });

  describe('GET /patients/me/profile', () => {
    it('returns 404 before the patient has saved a profile', async () => {
      const cookies = await signUpPatient();

      const response = await http().get('/patients/me/profile').set('Cookie', cookies).expect(404);

      expect(response.body).toMatchObject({ code: ErrorCode.NOT_FOUND });
    });

    it('returns the saved profile', async () => {
      const cookies = await signUpPatient();
      await http()
        .put('/patients/me/profile')
        .set('Cookie', cookies)
        .send(REQUIRED_FIELDS)
        .expect(200);

      const response = await http().get('/patients/me/profile').set('Cookie', cookies).expect(200);

      expect(response.body).toMatchObject({ ...REQUIRED_FIELDS, profileCompleted: true });
    });

    it.each([
      ['DOCTOR', signUpDoctor],
      ['ADMIN', signUpAdmin],
    ])('returns 403 for a %s caller', async (_label, signUp) => {
      const cookies = await signUp();

      const response = await http().get('/patients/me/profile').set('Cookie', cookies).expect(403);

      expect(response.body).toMatchObject({ code: ErrorCode.FORBIDDEN });
    });
  });

  describe('PUT /patients/me/profile', () => {
    it('creates the profile and marks it complete from required fields alone', async () => {
      const cookies = await signUpPatient();

      const response = await http()
        .put('/patients/me/profile')
        .set('Cookie', cookies)
        .send(REQUIRED_FIELDS)
        .expect(200);

      expect(response.body).toMatchObject({
        ...REQUIRED_FIELDS,
        emergencyContactName: null,
        emergencyContactPhone: null,
        allergies: null,
        chronicConditions: null,
        currentMedications: null,
        pastSurgeries: null,
        profileCompleted: true,
      });
    });

    it('stores optional medical-history and emergency-contact fields when provided', async () => {
      const cookies = await signUpPatient();

      const response = await http()
        .put('/patients/me/profile')
        .set('Cookie', cookies)
        .send({ ...REQUIRED_FIELDS, ...OPTIONAL_FIELDS })
        .expect(200);

      expect(response.body).toMatchObject({
        ...REQUIRED_FIELDS,
        ...OPTIONAL_FIELDS,
        profileCompleted: true,
      });
    });

    it('updates the existing row on a second call instead of creating a duplicate', async () => {
      const cookies = await signUpPatient();
      await http()
        .put('/patients/me/profile')
        .set('Cookie', cookies)
        .send(REQUIRED_FIELDS)
        .expect(200);

      const response = await http()
        .put('/patients/me/profile')
        .set('Cookie', cookies)
        .send({ ...REQUIRED_FIELDS, city: 'Makati City' })
        .expect(200);

      expect(response.body).toMatchObject({ city: 'Makati City', profileCompleted: true });
      expect(await prisma.patientProfile.count()).toBe(
        await prisma.patientProfile.count({ where: { city: 'Makati City' } }),
      );
    });

    it.each([
      ['birthDate in the future', { birthDate: '2999-01-01' }],
      ['birthDate implying an age over 120', { birthDate: '1800-01-01' }],
      ['weightKg below the minimum', { weightKg: 0 }],
      ['weightKg above the maximum', { weightKg: 401 }],
      ['heightCm below the minimum', { heightCm: 10 }],
      ['heightCm above the maximum', { heightCm: 999 }],
      ['a malformed phone number', { phone: 'not-a-phone' }],
      ['allergies over 2000 characters', { allergies: 'a'.repeat(2001) }],
      ['chronicConditions over 2000 characters', { chronicConditions: 'a'.repeat(2001) }],
    ])('rejects %s', async (_label, override) => {
      const cookies = await signUpPatient();

      const response = await http()
        .put('/patients/me/profile')
        .set('Cookie', cookies)
        .send({ ...REQUIRED_FIELDS, ...override })
        .expect(400);

      expect(response.body).toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    });

    it('rejects a client-supplied profileCompleted field', async () => {
      const cookies = await signUpPatient();

      const response = await http()
        .put('/patients/me/profile')
        .set('Cookie', cookies)
        .send({ ...REQUIRED_FIELDS, profileCompleted: false })
        .expect(400);

      expect(response.body).toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    });

    it.each([
      ['DOCTOR', signUpDoctor],
      ['ADMIN', signUpAdmin],
    ])('returns 403 for a %s caller', async (_label, signUp) => {
      const cookies = await signUp();

      const response = await http()
        .put('/patients/me/profile')
        .set('Cookie', cookies)
        .send(REQUIRED_FIELDS)
        .expect(403);

      expect(response.body).toMatchObject({ code: ErrorCode.FORBIDDEN });
    });
  });
});
