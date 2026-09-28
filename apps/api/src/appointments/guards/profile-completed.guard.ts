import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import type { AuthenticatedRequest } from '../../auth/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfileIncompleteException } from '../appointments.exceptions';

/**
 * Restricts a route to a `PATIENT` whose `PatientProfile.profileCompleted` is
 * `true`. Runs after the global `JwtAuthGuard`/`RolesGuard` (so `request.user`
 * is already set) and after `@Roles(Role.PATIENT)` on the same route.
 *
 * NOTE: this is a local copy of the same guard concept as
 * `feat/patient-profile`'s `apps/api/src/patients/guards/profile-completed.guard.ts`,
 * which is not available on this branch (parallel, stacked development — see
 * this task's final report). When the two branches are merged, de-duplicate
 * in favor of one shared guard.
 *
 * @throws ProfileIncompleteException if the signed-in patient has no
 *   `PatientProfile` row, or `profileCompleted` is not `true`.
 */
@Injectable()
export class ProfileCompletedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;
    if (!userId) {
      // JwtAuthGuard (global) already guarantees a caller before this guard runs;
      // this is only a defensive fallback.
      return false;
    }

    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId },
      select: { profileCompleted: true },
    });
    if (!profile?.profileCompleted) {
      throw new ProfileIncompleteException();
    }
    return true;
  }
}
