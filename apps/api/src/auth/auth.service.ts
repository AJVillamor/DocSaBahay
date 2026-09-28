import { Injectable } from '@nestjs/common';
import { AccountStatus, Prisma, Role, User, VerificationStatus } from '@prisma/client';
import { hash, verify } from 'argon2';

import { PrismaService } from '../prisma/prisma.service';
import {
  AccountInactiveException,
  AuthenticationRequiredException,
  EmailTakenException,
  InvalidCredentialsException,
  UnknownSpecializationException,
} from './auth.exceptions';
import { LoginDto, RegisterDoctorDto, RegisterPatientDto } from './dto/auth.dto';
import { MeResponseDto } from './dto/me-response.dto';
import { TokenService } from './token.service';

/** Result of a successful sign-in: the tokens go into cookies, `me` into the body. */
export interface AuthSession {
  me: MeResponseDto;
  accessToken: string;
  refreshToken: string;
}

/** Defaults for a newly registered doctor; the doctor edits these later. */
const NEW_DOCTOR_DEFAULTS = {
  title: 'Dr.',
  yearsExperience: 0,
  languages: [],
  timezone: 'Asia/Manila',
} satisfies Partial<Prisma.DoctorProfileCreateWithoutUserInput>;

@Injectable()
export class AuthService {
  /** Verified against when the email is unknown, so response time does not reveal it. */
  private readonly dummyHash = hash('dummy-password-for-timing-1');

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  /**
   * Creates a PATIENT account (no profile yet, so `profileCompleted` is false) and signs in.
   *
   * @throws EmailTakenException if the email is already registered.
   */
  async registerPatient(dto: RegisterPatientDto): Promise<AuthSession> {
    const passwordHash = await hash(dto.password);
    const user = await this.createUser(() =>
      this.prisma.user.create({
        data: { email: dto.email, passwordHash, role: Role.PATIENT },
      }),
    );
    return this.startSession(user);
  }

  /**
   * Creates a DOCTOR account with a PENDING profile and primary specialization, and signs in.
   *
   * @throws UnknownSpecializationException if `primarySpecializationId` does not exist.
   * @throws EmailTakenException if the email is already registered.
   */
  async registerDoctor(dto: RegisterDoctorDto): Promise<AuthSession> {
    const specialization = await this.prisma.specialization.findUnique({
      where: { id: dto.primarySpecializationId },
      select: { id: true },
    });
    if (!specialization) {
      throw new UnknownSpecializationException();
    }

    const passwordHash = await hash(dto.password);
    const user = await this.createUser(() =>
      this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: Role.DOCTOR,
          doctorProfile: {
            create: {
              ...NEW_DOCTOR_DEFAULTS,
              firstName: dto.firstName,
              lastName: dto.lastName,
              licenseNumber: dto.licenseNumber,
              bio: dto.bio ?? '',
              verificationStatus: VerificationStatus.PENDING,
            },
          },
          doctorSpecializations: {
            create: { specializationId: specialization.id, isPrimary: true },
          },
        },
      }),
    );
    return this.startSession(user);
  }

  /**
   * Verifies the credentials and signs in. The password is checked before
   * the account status, so a wrong password never reveals that an account is suspended.
   *
   * @throws InvalidCredentialsException for an unknown email or wrong password.
   * @throws AccountInactiveException when the account is suspended or deactivated.
   */
  async login(dto: LoginDto): Promise<AuthSession> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    const passwordOk = await this.verifyPassword(
      user?.passwordHash ?? (await this.dummyHash),
      dto.password,
    );
    if (!user || !passwordOk) {
      throw new InvalidCredentialsException();
    }
    if (user.status !== AccountStatus.ACTIVE) {
      throw new AccountInactiveException(user.status);
    }
    return this.startSession(user);
  }

  /**
   * Rotates the refresh token and issues a fresh access token.
   *
   * @throws InvalidRefreshTokenException / AccountInactiveException, see `TokenService.rotateRefreshToken`.
   */
  async refresh(refreshToken: string): Promise<AuthSession> {
    const rotated = await this.tokens.rotateRefreshToken(refreshToken);
    return {
      me: await this.me(rotated.user.id),
      accessToken: await this.tokens.signAccessToken(rotated.user),
      refreshToken: rotated.refreshToken,
    };
  }

  /** Revokes the given refresh token, if any. Always succeeds. */
  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) {
      await this.tokens.revokeRefreshToken(refreshToken);
    }
  }

  /**
   * Builds the `GET /auth/me` payload.
   *
   * @throws AuthenticationRequiredException if the user no longer exists.
   */
  async me(userId: string): Promise<MeResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        patientProfile: { select: { firstName: true, lastName: true, profileCompleted: true } },
        doctorProfile: { select: { firstName: true, lastName: true, verificationStatus: true } },
      },
    });
    if (!user) {
      throw new AuthenticationRequiredException();
    }

    const profile = user.doctorProfile ?? user.patientProfile;
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      profile: profile ? { firstName: profile.firstName, lastName: profile.lastName } : null,
      ...(user.role === Role.DOCTOR && {
        verificationStatus: user.doctorProfile?.verificationStatus ?? VerificationStatus.PENDING,
      }),
      ...(user.role === Role.PATIENT && {
        profileCompleted: user.patientProfile?.profileCompleted ?? false,
      }),
    };
  }

  private async startSession(user: User): Promise<AuthSession> {
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return {
      me: await this.me(user.id),
      accessToken: await this.tokens.signAccessToken(user),
      refreshToken: await this.tokens.issueRefreshToken(user.id),
    };
  }

  /** Runs the create and maps a unique-email violation (including races) to EMAIL_TAKEN. */
  private async createUser(create: () => Promise<User>): Promise<User> {
    try {
      return await create();
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new EmailTakenException();
      }
      throw error;
    }
  }

  private async verifyPassword(passwordHash: string, password: string): Promise<boolean> {
    try {
      return await verify(passwordHash, password);
    } catch {
      // A malformed stored hash can never match; treat it as a wrong password.
      return false;
    }
  }
}
