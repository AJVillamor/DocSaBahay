import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/** Claims inside a short-lived realtime-gateway auth token: just who the caller is. */
export interface RealtimeTokenPayload {
  sub: string;
}

/** How long a realtime token is valid for — deliberately short-lived, see `RealtimeTokenService`. */
export const REALTIME_TOKEN_TTL_SECONDS = 60;

/**
 * Issues the short-lived JWT that proves a browser's identity to
 * `NotificationsGateway` during the socket handshake.
 *
 * Design choice: sign a minimal, separately-purposed JWT rather than an
 * in-memory single-use token map. Both are acceptable for this repo's scale;
 * a JWT was picked because it needs no shared/cleaned-up server state and
 * this module can reuse `AuthModule`'s already-configured `JwtService`
 * instance and `JWT_ACCESS_SECRET` (see `AuthModule`'s export comment)
 * instead of standing up a second secret or cache. It deliberately does
 * *not* reuse `TokenService.signAccessToken` verbatim: that method's 15
 * minute TTL and `{ sub, role, tokenVersion }` payload are shaped for the
 * main auth session, not a 60-second, identity-only handshake credential.
 */
@Injectable()
export class RealtimeTokenService {
  constructor(private readonly jwt: JwtService) {}

  /** Signs a `{ sub: userId }` token valid for {@link REALTIME_TOKEN_TTL_SECONDS}. */
  signToken(userId: string): Promise<string> {
    const payload: RealtimeTokenPayload = { sub: userId };
    return this.jwt.signAsync(payload, { expiresIn: REALTIME_TOKEN_TTL_SECONDS });
  }
}
