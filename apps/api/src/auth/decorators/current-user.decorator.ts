import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { AuthenticationRequiredException } from '../auth.exceptions';
import type { AuthenticatedRequest, AuthUser } from '../auth.types';

/** Injects the authenticated caller. Only valid on routes guarded by `JwtAuthGuard`. */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const user = ctx.switchToHttp().getRequest<AuthenticatedRequest>().user;
  if (!user) {
    throw new AuthenticationRequiredException();
  }
  return user;
});
