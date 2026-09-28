import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccountStatus } from '@prisma/client';

import { AccountInactiveException, AuthenticationRequiredException } from '../auth.exceptions';
import { AuthStateService } from '../auth-state.service';
import { ACCESS_COOKIE, AuthenticatedRequest, readCookie } from '../auth.types';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenService } from '../token.service';

/**
 * Global guard: every route requires a valid access-token cookie unless it is
 * marked `@Public()`. The token's `tokenVersion` and the account status are
 * checked against the database (via a 30 s cache) on every request, so
 * suspending a user or bumping `tokenVersion` revokes access tokens at once.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly authState: AuthStateService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic || context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = readCookie(request, ACCESS_COOKIE);
    const payload = token ? await this.tokens.verifyAccessToken(token) : null;
    if (!payload) {
      throw new AuthenticationRequiredException();
    }

    let state = await this.authState.get(payload.sub);
    if (state && state.tokenVersion !== payload.tokenVersion) {
      // The cache may be older than the token (e.g. just after a version bump).
      state = await this.authState.get(payload.sub, { fresh: true });
    }
    if (!state || state.tokenVersion !== payload.tokenVersion) {
      throw new AuthenticationRequiredException();
    }
    if (state.status !== AccountStatus.ACTIVE) {
      throw new AccountInactiveException(state.status);
    }

    request.user = { id: payload.sub, role: state.role };
    return true;
  }
}
