import type { ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';

import { AuthenticationRequiredException } from '../../auth/auth.exceptions';
import type { AuthUser } from '../../auth/auth.types';
import type { PrismaService } from '../../prisma/prisma.service';
import { ProfileIncompleteException } from '../patients.exceptions';
import { ProfileCompletedGuard } from './profile-completed.guard';

function contextFor(user?: AuthUser): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('ProfileCompletedGuard', () => {
  const patient: AuthUser = { id: 'patient-1', role: Role.PATIENT };
  const prisma = { patientProfile: { findUnique: jest.fn() } };
  const guard = new ProfileCompletedGuard(prisma as unknown as PrismaService);

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('requires an authenticated request', async () => {
    await expect(guard.canActivate(contextFor(undefined))).rejects.toBeInstanceOf(
      AuthenticationRequiredException,
    );
  });

  it('blocks a caller with no saved profile', async () => {
    prisma.patientProfile.findUnique.mockResolvedValueOnce(null);

    await expect(guard.canActivate(contextFor(patient))).rejects.toBeInstanceOf(
      ProfileIncompleteException,
    );
    expect(prisma.patientProfile.findUnique).toHaveBeenCalledWith({
      where: { userId: patient.id },
      select: { profileCompleted: true },
    });
  });

  it('blocks a caller with an incomplete profile', async () => {
    prisma.patientProfile.findUnique.mockResolvedValueOnce({ profileCompleted: false });

    await expect(guard.canActivate(contextFor(patient))).rejects.toBeInstanceOf(
      ProfileIncompleteException,
    );
  });

  it('allows a caller with a completed profile', async () => {
    prisma.patientProfile.findUnique.mockResolvedValueOnce({ profileCompleted: true });

    await expect(guard.canActivate(contextFor(patient))).resolves.toBe(true);
  });
});
