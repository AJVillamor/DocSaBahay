import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ErrorCode } from '@doksabahay/shared';
import { AccountStatus, Role, VerificationStatus } from '@prisma/client';
import { hash } from 'argon2';
import request, { type Response } from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { AuthStateService } from '../src/auth/auth-state.service';
import { Roles } from '../src/auth/decorators/roles.decorator';
import { PrismaService } from '../src/prisma/prisma.service';
import { buildOpenApiDocument } from '../src/swagger';

/** Test-only routes for exercising the global guards. */
@Controller('probe')
class ProbeController {
  @Get('private')
  private(): { ok: true } {
    return { ok: true };
  }

  @Roles(Role.DOCTOR)
  @Get('doctor-only')
  doctorOnly(): { ok: true } {
    return { ok: true };
  }

  @Roles(Role.ADMIN)
  @Get('admin-only')
  adminOnly(): { ok: true } {
    return { ok: true };
  }
}

const PASSWORD = 'Password123!';

/** `name=value` pairs from Set-Cookie, skipping cookies that are being cleared. */
function cookiesFrom(response: Response): string[] {
  const header = response.headers['set-cookie'] as unknown as string[] | undefined;
  return (header ?? [])
    .map((cookie) => cookie.split(';')[0] ?? '')
    .filter((pair) => !pair.endsWith('='));
}

function cookieValue(response: Response, name: string): string | undefined {
  return cookiesFrom(response)
    .find((pair) => pair.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function rawSetCookies(response: Response): string[] {
  return (response.headers['set-cookie'] as unknown as string[] | undefined) ?? [];
}

describe('auth (db_test)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let authState: AuthStateService;
  let specializationId: string;
  let emailCounter = 0;

  /** A fresh email per call keeps tests independent of the login throttle. */
  const uniqueEmail = (label: string): string => `${label}.${++emailCounter}@example.com`;
  const http = () => request(app.getHttpServer());

  const registerPatient = (email: string, password = PASSWORD) =>
    http().post('/auth/register/patient').send({ email, password });

  const login = (email: string, password = PASSWORD) =>
    http().post('/auth/login').send({ email, password });

  async function wipe(): Promise<void> {
    await prisma.$executeRawUnsafe('TRUNCATE users, specializations CASCADE');
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app, { webOrigin: 'http://localhost:3000' });
    await app.init();

    prisma = app.get(PrismaService);
    authState = app.get(AuthStateService);
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

  describe('POST /auth/register/patient', () => {
    it('creates a PATIENT, normalizes the email, hashes with argon2 and signs in', async () => {
      const response = await registerPatient('  New.Patient@Example.COM ').expect(201);

      expect(response.body).toEqual({
        id: expect.any(String) as string,
        email: 'new.patient@example.com',
        role: Role.PATIENT,
        status: AccountStatus.ACTIVE,
        profile: null,
        profileCompleted: false,
      });

      const user = await prisma.user.findUniqueOrThrow({
        where: { email: 'new.patient@example.com' },
      });
      expect(user.passwordHash).toMatch(/^\$argon2id\$/);
      expect(user.lastLoginAt).not.toBeNull();

      const setCookies = rawSetCookies(response);
      for (const name of ['access_token', 'refresh_token']) {
        const cookie = setCookies.find((c) => c.startsWith(`${name}=`));
        expect(cookie).toMatch(/HttpOnly/);
        expect(cookie).toMatch(/SameSite=Lax/);
      }

      await http()
        .get('/auth/me')
        .set('Cookie', cookiesFrom(response))
        .expect(200)
        .expect((me) => expect((me.body as { id: string }).id).toBe(user.id));
    });

    it.each([
      ['too short', 'abc12345'],
      ['no number', 'onlyletterspassword'],
      ['no letter', '12345678901234'],
    ])('rejects a weak password (%s)', async (_label, password) => {
      const response = await registerPatient(uniqueEmail('weak'), password).expect(400);

      expect(response.body).toMatchObject({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Password must be 10–128 characters and include a letter and a number.',
      });
    });

    it('returns 409 EMAIL_TAKEN for a duplicate email, ignoring case', async () => {
      const email = uniqueEmail('dup');
      await registerPatient(email).expect(201);

      const response = await registerPatient(email.toUpperCase()).expect(409);

      expect(response.body).toEqual({
        statusCode: 409,
        message: 'An account with this email already exists.',
        code: ErrorCode.EMAIL_TAKEN,
      });
    });

    it.each(['/auth/register/patient', '/auth/register/doctor'])(
      'cannot create an ADMIN by injecting a role field (%s)',
      async (path) => {
        const email = uniqueEmail('sneaky');
        const doctorFields = {
          firstName: 'Sneaky',
          lastName: 'Admin',
          primarySpecializationId: specializationId,
          licenseNumber: 'FAKE-000',
        };
        const response = await http()
          .post(path)
          .send({
            email,
            password: PASSWORD,
            ...(path.endsWith('doctor') && doctorFields),
            role: Role.ADMIN,
          })
          .expect(400);

        expect(response.body).toMatchObject({
          code: ErrorCode.VALIDATION_FAILED,
          message: 'property role should not exist',
        });
        expect(await prisma.user.count({ where: { email } })).toBe(0);
        expect(await prisma.user.count({ where: { role: Role.ADMIN } })).toBe(0);
      },
    );
  });

  describe('POST /auth/register/doctor', () => {
    it('creates a PENDING doctor with a primary specialization and signs in', async () => {
      const email = uniqueEmail('doctor');
      const response = await http()
        .post('/auth/register/doctor')
        .send({
          email,
          password: PASSWORD,
          firstName: ' Maria ',
          lastName: 'Santos',
          primarySpecializationId: specializationId,
          licenseNumber: 'FAKE-PRC-0000001',
        })
        .expect(201);

      expect(response.body).toMatchObject({
        email,
        role: Role.DOCTOR,
        profile: { firstName: 'Maria', lastName: 'Santos' },
        verificationStatus: VerificationStatus.PENDING,
        reviewNote: null,
      });
      expect(response.body).not.toHaveProperty('profileCompleted');
      expect(cookieValue(response, 'access_token')).toBeTruthy();

      const user = await prisma.user.findUniqueOrThrow({
        where: { email },
        include: { doctorProfile: true, doctorSpecializations: true },
      });
      expect(user.doctorProfile).toMatchObject({ licenseNumber: 'FAKE-PRC-0000001', bio: '' });
      expect(user.doctorSpecializations).toEqual([
        expect.objectContaining({ specializationId, isPrimary: true }),
      ]);
    });

    it('rejects an unknown specialization', async () => {
      const response = await http()
        .post('/auth/register/doctor')
        .send({
          email: uniqueEmail('doctor'),
          password: PASSWORD,
          firstName: 'Ana',
          lastName: 'Cruz',
          primarySpecializationId: '00000000-0000-4000-8000-000000000000',
          licenseNumber: 'FAKE-PRC-0000002',
        })
        .expect(400);

      expect(response.body).toMatchObject({ code: ErrorCode.VALIDATION_FAILED });
    });
  });

  describe('POST /auth/login', () => {
    it('signs in, sets cookies and updates lastLoginAt', async () => {
      const email = uniqueEmail('login');
      await registerPatient(email).expect(201);
      await prisma.user.update({ where: { email }, data: { lastLoginAt: null } });

      const response = await login(email.toUpperCase()).expect(200);

      expect(response.body).toMatchObject({ email, role: Role.PATIENT });
      expect(cookieValue(response, 'access_token')).toBeTruthy();
      expect(cookieValue(response, 'refresh_token')).toBeTruthy();
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      expect(user.lastLoginAt).not.toBeNull();
    });

    it('returns the same 401 for a wrong password and an unknown email', async () => {
      const email = uniqueEmail('login');
      await registerPatient(email).expect(201);

      const wrongPassword = await login(email, 'WrongPassword1').expect(401);
      const unknownEmail = await login(uniqueEmail('nobody')).expect(401);

      const expected = {
        statusCode: 401,
        message: 'Invalid email or password.',
        code: ErrorCode.INVALID_CREDENTIALS,
      };
      expect(wrongPassword.body).toEqual(expected);
      expect(unknownEmail.body).toEqual(expected);
      expect(cookiesFrom(wrongPassword)).toEqual([]);
    });

    it('allows 5 attempts per minute per IP + email, then returns 429', async () => {
      const email = uniqueEmail('throttle');
      await registerPatient(email).expect(201);

      for (let attempt = 0; attempt < 5; attempt++) {
        await login(email, 'WrongPassword1').expect(401);
      }
      const blocked = await login(email).expect(429);
      expect(blocked.body).toMatchObject({ code: ErrorCode.TOO_MANY_REQUESTS });

      // A different email from the same IP is unaffected.
      const other = uniqueEmail('throttle');
      await registerPatient(other).expect(201);
      await login(other).expect(200);
    });
  });

  describe('global guards', () => {
    it('makes routes private by default', async () => {
      const response = await http().get('/probe/private').expect(401);
      expect(response.body).toMatchObject({ code: ErrorCode.UNAUTHORIZED });
    });

    it('keeps @Public routes open', async () => {
      await http().get('/health').expect(200);
      await http().get('/specializations').expect(200);
    });

    it('rejects a tampered access token', async () => {
      const response = await registerPatient(uniqueEmail('tamper')).expect(201);
      const token = cookieValue(response, 'access_token') ?? '';

      await http()
        .get('/probe/private')
        .set('Cookie', [`access_token=${token.slice(0, -2)}xx`])
        .expect(401);
    });

    it('blocks the wrong role with @Roles', async () => {
      const patient = await registerPatient(uniqueEmail('patient')).expect(201);
      const doctor = await http()
        .post('/auth/register/doctor')
        .send({
          email: uniqueEmail('doctor'),
          password: PASSWORD,
          firstName: 'Jose',
          lastName: 'Reyes',
          primarySpecializationId: specializationId,
          licenseNumber: 'FAKE-PRC-0000003',
        })
        .expect(201);

      const forbidden = await http()
        .get('/probe/doctor-only')
        .set('Cookie', cookiesFrom(patient))
        .expect(403);
      expect(forbidden.body).toMatchObject({ code: ErrorCode.FORBIDDEN });

      await http().get('/probe/doctor-only').set('Cookie', cookiesFrom(doctor)).expect(200);
      await http().get('/probe/admin-only').set('Cookie', cookiesFrom(doctor)).expect(403);
    });

    it('lets a seeded ADMIN through admin-only routes', async () => {
      const email = uniqueEmail('admin');
      await prisma.user.create({
        data: { email, passwordHash: await hash(PASSWORD), role: Role.ADMIN },
      });

      const response = await login(email).expect(200);
      await http().get('/probe/admin-only').set('Cookie', cookiesFrom(response)).expect(200);
    });
  });

  describe('inactive accounts', () => {
    it.each([
      [AccountStatus.SUSPENDED, 'Account is suspended.'],
      [AccountStatus.DEACTIVATED, 'Account is deactivated.'],
    ])('rejects login for a %s user without revealing the reason', async (status, message) => {
      const email = uniqueEmail('inactive');
      await registerPatient(email).expect(201);
      await prisma.user.update({
        where: { email },
        data: { status, statusReason: 'Confidential admin note' },
      });

      const response = await login(email).expect(403);

      expect(response.body).toEqual({ statusCode: 403, message, code: ErrorCode.ACCOUNT_INACTIVE });
      expect(JSON.stringify(response.body)).not.toContain('Confidential');
    });

    it('still returns 401 (not 403) for a suspended user with a wrong password', async () => {
      const email = uniqueEmail('inactive');
      await registerPatient(email).expect(201);
      await prisma.user.update({ where: { email }, data: { status: AccountStatus.SUSPENDED } });

      await login(email, 'WrongPassword1').expect(401);
    });

    it('cuts off an existing session as soon as the user is suspended', async () => {
      const email = uniqueEmail('inactive');
      const session = await registerPatient(email).expect(201);
      const cookies = cookiesFrom(session);
      await http().get('/auth/me').set('Cookie', cookies).expect(200);

      // What an admin "suspend" action does: flip status, bump tokenVersion, drop the cache.
      const user = await prisma.user.update({
        where: { email },
        data: { status: AccountStatus.SUSPENDED, tokenVersion: { increment: 1 } },
      });
      authState.invalidate(user.id);

      await http().get('/auth/me').set('Cookie', cookies).expect(401);
      const refresh = await http().post('/auth/refresh').set('Cookie', cookies).expect(403);
      expect(refresh.body).toMatchObject({ code: ErrorCode.ACCOUNT_INACTIVE });
      expect(rawSetCookies(refresh).some((c) => c.startsWith('refresh_token=;'))).toBe(true);
    });

    it('rejects access tokens once tokenVersion is bumped', async () => {
      const email = uniqueEmail('version');
      const session = await registerPatient(email).expect(201);
      const user = await prisma.user.update({
        where: { email },
        data: { tokenVersion: { increment: 1 } },
      });
      authState.invalidate(user.id);

      await http().get('/auth/me').set('Cookie', cookiesFrom(session)).expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token within the same family', async () => {
      const email = uniqueEmail('refresh');
      const session = await registerPatient(email).expect(201);
      const firstToken = cookieValue(session, 'refresh_token');

      const refreshed = await http()
        .post('/auth/refresh')
        .set('Cookie', cookiesFrom(session))
        .expect(200);

      expect(refreshed.body).toMatchObject({ email });
      const secondToken = cookieValue(refreshed, 'refresh_token');
      expect(secondToken).toBeTruthy();
      expect(secondToken).not.toBe(firstToken);
      await http().get('/auth/me').set('Cookie', cookiesFrom(refreshed)).expect(200);

      const tokens = await prisma.refreshToken.findMany({
        where: { user: { email } },
        orderBy: { createdAt: 'asc' },
      });
      expect(tokens).toHaveLength(2);
      expect(tokens[0]?.revokedAt).not.toBeNull();
      expect(tokens[1]?.revokedAt).toBeNull();
      expect(tokens[1]?.familyId).toBe(tokens[0]?.familyId);
      // Only a digest is stored, never the raw token.
      expect(tokens.map((t) => t.tokenHash)).not.toContain(secondToken);
    });

    it('detects reuse of a rotated token and revokes the whole family', async () => {
      const email = uniqueEmail('reuse');
      const session = await registerPatient(email).expect(201);
      const stolen = cookiesFrom(session);
      const refreshed = await http().post('/auth/refresh').set('Cookie', stolen).expect(200);

      const reuse = await http().post('/auth/refresh').set('Cookie', stolen).expect(401);
      expect(reuse.body).toMatchObject({ code: ErrorCode.INVALID_REFRESH_TOKEN });

      // The legitimate, newer token is now dead too.
      await http().post('/auth/refresh').set('Cookie', cookiesFrom(refreshed)).expect(401);
      const active = await prisma.refreshToken.count({
        where: { user: { email }, revokedAt: null },
      });
      expect(active).toBe(0);
    });

    it('returns 401 without a refresh cookie', async () => {
      const response = await http().post('/auth/refresh').expect(401);
      expect(response.body).toMatchObject({ code: ErrorCode.INVALID_REFRESH_TOKEN });
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the current refresh token and clears both cookies', async () => {
      const session = await registerPatient(uniqueEmail('logout')).expect(201);
      const cookies = cookiesFrom(session);

      const response = await http().post('/auth/logout').set('Cookie', cookies).expect(204);

      const cleared = rawSetCookies(response);
      expect(cleared.some((c) => c.startsWith('access_token=;'))).toBe(true);
      expect(cleared.some((c) => c.startsWith('refresh_token=;'))).toBe(true);
      await http().post('/auth/refresh').set('Cookie', cookies).expect(401);
    });
  });

  it('documents every endpoint in Swagger', () => {
    const document = buildOpenApiDocument(app);
    const operations = Object.entries(document.paths)
      .filter(([path]) => !path.startsWith('/probe'))
      .flatMap(([path, item]) =>
        (['get', 'post', 'put', 'patch', 'delete'] as const)
          .filter((method) => item[method])
          .map((method) => ({ path, method, operation: item[method] })),
      );

    expect(operations.map((o) => `${o.method.toUpperCase()} ${o.path}`).sort()).toEqual(
      [
        'GET /auth/me',
        'GET /health',
        'POST /auth/login',
        'POST /auth/logout',
        'POST /auth/refresh',
        'POST /auth/register/doctor',
        'POST /auth/register/patient',
        'GET /specializations',
      ].sort(),
    );
    for (const { operation } of operations) {
      expect(operation?.summary).toBeTruthy();
      expect(operation?.tags?.length).toBeGreaterThan(0);
      expect(Object.keys(operation?.responses ?? {}).length).toBeGreaterThan(0);
    }
  });
});
