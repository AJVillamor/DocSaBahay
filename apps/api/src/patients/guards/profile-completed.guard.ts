import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { AuthenticationRequiredException } from '../../auth/auth.exceptions';
import type { AuthenticatedRequest } from '../../auth/auth.types';
import { PrismaService } from '../../prisma/prisma.service';
import { ProfileIncompleteException } from '../patients.exceptions';

/**
 * Blocks a route unless the signed-in patient has a completed profile.
 * Not wired into any route yet; a future booking module (and others that
 * require a complete profile) apply it with `@UseGuards(ProfileCompletedGuard)`.
 *
 * Must run after `JwtAuthGuard`/`RolesGuard`, which populate `request.user`.
 */
@Injectable()
export class ProfileCompletedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  /** @throws ProfileIncompleteException if the caller has no profile, or an incomplete one. */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;
    if (!user) {
      throw new AuthenticationRequiredException();
    }

    const profile = await this.prisma.patientProfile.findUnique({
      where: { userId: user.id },
      select: { profileCompleted: true },
    });
    if (!profile?.profileCompleted) {
      throw new ProfileIncompleteException();
    }
    return true;
  }
}
