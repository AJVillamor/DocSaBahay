import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorCode } from '@doksabahay/shared';
import { Role, VerificationStatus } from '@prisma/client';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';

const PASSWORD = 'Password123!';

function cookiesFrom(response: Response): string[] {
  const header = response.headers['set-cookie'] as unknown as string[] | undefined;
  return (header ?? [])
    .map((cookie) => cookie.split(';')[0] ?? '')
    .filter((pair) => !pair.endsWith('='));
}

describe('doctor profile (db_test)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let specializationAId: string;
  let specializationBId: string;
  let emailCounter = 0;

  const http = () => request(app.getHttpServer());
  const uniqueEmail = (label: string): string => `${label}.${++emailCounter}@example.com`;

  async function wipe(): Promise<void> {
    await prisma.$executeRawUnsafe('TRUNCATE users, specializations CASCADE');
  }

  /** Registers a doctor with a single primary specialization and returns their session cookies + id. */
  async function registerDoctor(email: string): Promise<{ cookies: string[]; id: string }> {
    const response = await http()
      .post('/auth/register/doctor')
      .send({
        email,
        password: PASSWORD,
        firstName: 'Test',
        lastName: 'Doctor',
        primarySpecializationId: specializationAId,
        licenseNumber: `FAKE-${++emailCounter}`,
      })
      .expect(201);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    return { cookies: cookiesFrom(response), id: user.id };
  }

  /** Approves a doctor's profile as a fictional admin, so a later edit can be checked for a reset. */
  async function approve(doctorId: string): Promise<string> {
    const admin = await prisma.user.create({
      data: { email: uniqueEmail('admin'), passwordHash: 'not-a-real-hash', role: Role.ADMIN },
    });
    await prisma.doctorProfile.update({
      where: { userId: doctorId },
      data: {
        verificationStatus: VerificationStatus.APPROVED,
        reviewNote: 'Looks good.',
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });
    return admin.id;
  }

  const validUpdateBody = (overrides: Record<string, unknown> = {}) => ({
    title: 'Dr.',
    bio: 'Updated bio.',
    yearsExperience: 5,
    licenseNumber: 'FAKE-UPDATED-0001',
    languages: ['English'],
    consultationMinutes: 30,
    timezone: 'Asia/Manila',
    specializations: [{ specializationId: specializationAId, isPrimary: true }],
    ...overrides,
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, { webOrigin: 'http://localhost:3000' });
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await wipe();
    const [a, b] = await Promise.all([
      prisma.specialization.create({
        data: { name: 'General Practice', slug: 'general-practice', description: 'Fictional' },
      }),
      prisma.specialization.create({
        data: { name: 'Dermatology', slug: 'dermatology', description: 'Fictional' },
      }),
    ]);
    specializationAId = a.id;
    specializationBId = b.id;
  });

  afterAll(async () => {
    await wipe();
    await app.close();
  });

  describe('GET /doctors/me/profile', () => {
    it("returns the signed-in doctor's profile", async () => {
      const email = uniqueEmail('doctor');
      const { cookies } = await registerDoctor(email);

      const response = await http().get('/doctors/me/profile').set('Cookie', cookies).expect(200);

      expect(response.body).toMatchObject({
        firstName: 'Test',
        lastName: 'Doctor',
        verificationStatus: VerificationStatus.PENDING,
        specializations: [
          expect.objectContaining({ specializationId: specializationAId, isPrimary: true }),
        ],
      });
    });

    it('rejects a non-doctor caller', async () => {
      const patientResponse = await http()
        .post('/auth/register/patient')
        .send({ email: uniqueEmail('patient'), password: PASSWORD })
        .expect(201);

      const response = await http()
        .get('/doctors/me/profile')
        .set('Cookie', cookiesFrom(patientResponse))
        .expect(403);
      expect(response.body).toMatchObject({ code: ErrorCode.FORBIDDEN });
    });

    it('rejects an unauthenticated caller', async () => {
      const response = await http().get('/doctors/me/profile').expect(401);
      expect(response.body).toMatchObject({ code: ErrorCode.UNAUTHORIZED });
    });
  });

  describe('PUT /doctors/me/profile', () => {
    it('updates editable fields without touching verification status', async () => {
      const { cookies, id } = await registerDoctor(uniqueEmail('doctor'));

      const response = await http()
        .put('/doctors/me/profile')
        .set('Cookie', cookies)
        .send(validUpdateBody({ bio: 'A new bio.', yearsExperience: 9 }))
        .expect(200);

      expect(response.body).toMatchObject({
        bio: 'A new bio.',
        yearsExperience: 9,
        verificationStatus: VerificationStatus.PENDING,
      });
      const profile = await prisma.doctorProfile.findUniqueOrThrow({ where: { userId: id } });
      expect(profile.licenseNumber).toBe('FAKE-UPDATED-0001');
    });

    it('does NOT reset an APPROVED profile when only bio/languages/title/years/consultationMinutes/timezone change', async () => {
      const { cookies, id } = await registerDoctor(uniqueEmail('doctor'));
      const profileBefore = await prisma.doctorProfile.findUniqueOrThrow({ where: { userId: id } });
      const adminId = await approve(id);

      const response = await http()
        .put('/doctors/me/profile')
        .set('Cookie', cookies)
        .send(
          validUpdateBody({
            licenseNumber: profileBefore.licenseNumber, // unchanged
            bio: 'Only the bio changed.',
            title: 'Prof.',
            yearsExperience: 15,
            consultationMinutes: 45,
            timezone: 'Asia/Singapore',
          }),
        )
        .expect(200);

      expect(response.body).toMatchObject({
        verificationStatus: VerificationStatus.APPROVED,
        bio: 'Only the bio changed.',
      });
      const profile = await prisma.doctorProfile.findUniqueOrThrow({ where: { userId: id } });
      expect(profile.reviewedById).toBe(adminId);
      expect(profile.reviewNote).toBe('Looks good.');
    });

    it('resets an APPROVED profile to PENDING when the specialization selection changes', async () => {
      const { cookies, id } = await registerDoctor(uniqueEmail('doctor'));
      const profileBefore = await prisma.doctorProfile.findUniqueOrThrow({ where: { userId: id } });
      await approve(id);

      const response = await http()
        .put('/doctors/me/profile')
        .set('Cookie', cookies)
        .send(
          validUpdateBody({
            licenseNumber: profileBefore.licenseNumber,
            specializations: [
              { specializationId: specializationAId, isPrimary: true },
              { specializationId: specializationBId, isPrimary: false },
            ],
          }),
        )
        .expect(200);

      expect(response.body).toMatchObject({
        verificationStatus: VerificationStatus.PENDING,
        reviewNote: 'Profile changed: specializations/license updated',
      });
      const profile = await prisma.doctorProfile.findUniqueOrThrow({ where: { userId: id } });
      expect(profile.reviewedById).toBeNull();
      expect(profile.reviewedAt).toBeNull();
    });

    it('resets an APPROVED profile to PENDING when licenseNumber changes', async () => {
      const { cookies, id } = await registerDoctor(uniqueEmail('doctor'));
      await approve(id);

      const response = await http()
        .put('/doctors/me/profile')
        .set('Cookie', cookies)
        .send(validUpdateBody({ licenseNumber: 'FAKE-CHANGED-0002' }))
        .expect(200);

      expect(response.body).toMatchObject({
        verificationStatus: VerificationStatus.PENDING,
        reviewNote: 'Profile changed: specializations/license updated',
        licenseNumber: 'FAKE-CHANGED-0002',
      });
      const profile = await prisma.doctorProfile.findUniqueOrThrow({ where: { userId: id } });
      expect(profile.reviewedById).toBeNull();
    });

    it.each([
      ['no primary', [{ specializationId: 0, isPrimary: false }]],
      [
        'two primaries',
        [
          { specializationId: 0, isPrimary: true },
          { specializationId: 1, isPrimary: true },
        ],
      ],
    ])('rejects an invalid specialization selection (%s)', async (_label, specs) => {
      const { cookies } = await registerDoctor(uniqueEmail('doctor'));
      const ids = [specializationAId, specializationBId];
      const specializations = specs.map((s) => ({
        ...s,
        specializationId: ids[s.specializationId],
      }));

      const response = await http()
        .put('/doctors/me/profile')
        .set('Cookie', cookies)
        .send(validUpdateBody({ specializations }))
        .expect(400);
      expect(response.body).toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    });

    it('rejects an unknown specialization id', async () => {
      const { cookies } = await registerDoctor(uniqueEmail('doctor'));

      const response = await http()
        .put('/doctors/me/profile')
        .set('Cookie', cookies)
        .send(
          validUpdateBody({
            specializations: [
              { specializationId: '00000000-0000-4000-8000-000000000000', isPrimary: true },
            ],
          }),
        )
        .expect(400);
      expect(response.body).toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    });

    it('rejects a non-doctor caller', async () => {
      const patientResponse = await http()
        .post('/auth/register/patient')
        .send({ email: uniqueEmail('patient'), password: PASSWORD })
        .expect(201);

      const response = await http()
        .put('/doctors/me/profile')
        .set('Cookie', cookiesFrom(patientResponse))
        .send(validUpdateBody())
        .expect(403);
      expect(response.body).toMatchObject({ code: ErrorCode.FORBIDDEN });
    });
  });
});
